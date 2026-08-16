/** Bark VTXO decoding.
 *
 * A VTXO ("virtual UTXO") is an Ark client's proof of an off-chain coin. It
 * carries the coin's amount and spending policy plus the full *exit chain*:
 * the pre-signed transactions that move the coin back on-chain unilaterally,
 * without the Ark server's cooperation.
 *
 * The wire format is bark's own `ProtocolEncoding` at
 * `VTXO_ENCODING_VERSION = 2`. Everything is little-endian:
 *
 * ```text
 * u16  version
 * u64  amount (sats)
 * u32  expiry_height
 * 33B  server_pubkey
 * u16  exit_delta
 * 36B  anchor_point       txid (32) + vout (u32)
 *      genesis            compact_size count, then N items
 *      policy             1 type byte + variant fields
 * 36B  point              this VTXO's own outpoint (== its id)
 * ```
 *
 * The encoding carries no network marker, so mainnet, signet and regtest
 * VTXOs are structurally identical and decode through the same path.
 */

import { ripemd160 } from '@noble/hashes/legacy.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import type {
  VtxoData,
  VtxoExitStep,
  VtxoGenesisItem,
  VtxoPolicy,
  VtxoTransition,
  VtxoTxOut
} from '../types'
import { DecodeError } from '../types'
import {
  aggregateKeys,
  assertCompressedPubkey,
  COMPRESSED_PUBKEY_LENGTH,
  encodeCompactSize,
  taggedHash,
  tapLeafHash,
  taprootOutputKey,
  toXOnly,
  xOnlyTweakAdd
} from './musig'

/** The only VTXO encoding version this decoder accepts. */
const VTXO_ENCODING_VERSION = 2
/** Legacy version without a per-genesis-item fee amount. Rejected explicitly. */
const VTXO_NO_FEE_AMOUNT_VERSION = 1

const SCHNORR_SIGNATURE_LENGTH = 64
const SHA256_LENGTH = 32
const OUTPOINT_LENGTH = 36
const TXID_LENGTH = 32

/** Exit transactions are TRUC (v3) with a P2A fee anchor. */
const EXIT_TX_VERSION = 3
/** The pay-to-anchor output script shared by every exit transaction. */
const P2A_SCRIPT_HEX = '51024e73'

const GENESIS_TRANSITION_COSIGNED = 1
const GENESIS_TRANSITION_ARKOOR = 2
const GENESIS_TRANSITION_HASH_LOCKED_COSIGNED_V0 = 3
const GENESIS_TRANSITION_HASH_LOCKED_COSIGNED = 4

const POLICY_PUBKEY = 0x00
const POLICY_SERVER_HTLC_SEND_V0 = 0x01
const POLICY_SERVER_HTLC_RECV_V0 = 0x02
const POLICY_CHECKPOINT = 0x03
const POLICY_EXPIRY = 0x04
const POLICY_HARK_LEAF_V0 = 0x05
const POLICY_HARK_FORFEIT_V0 = 0x06
const POLICY_SERVER_OWNED = 0x07
const POLICY_SERVER_HTLC_RECV = 0x08
const POLICY_SERVER_HTLC_SEND = 0x09
const POLICY_HARK_LEAF = 0x0a
const POLICY_HARK_FORFEIT = 0x0b

const OP_DROP = 0x75
const OP_CHECKSIG = 0xac
const OP_CLTV = 0xb1
const OP_CSV = 0xb2
const OP_SIZE = 0x82
const OP_EQUALVERIFY = 0x88
const OP_HASH160 = 0xa9

const HEX_RADIX = 16
const MAX_SAFE_SATS = BigInt(Number.MAX_SAFE_INTEGER)

const HEX_PREFIX_PATTERN = /^0x/i
const HEX_PATTERN = /^[0-9a-fA-F]+$/

/** Sequential little-endian reader over the VTXO byte string. */
class Reader {
  private readonly view: DataView

  private readonly bytes: Uint8Array

  private offset = 0

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  get remaining(): number {
    return this.bytes.length - this.offset
  }

  private require(length: number): void {
    if (this.offset + length > this.bytes.length) {
      throw new DecodeError(
        `VTXO data ended early: needed ${length} more byte(s) at offset ${this.offset}`,
        'INVALID_VTXO'
      )
    }
  }

  readU8(): number {
    this.require(1)
    const value = this.view.getUint8(this.offset)
    this.offset += 1
    return value
  }

  readU16(): number {
    this.require(2)
    const value = this.view.getUint16(this.offset, true)
    this.offset += 2
    return value
  }

  readU32(): number {
    this.require(4)
    const value = this.view.getUint32(this.offset, true)
    this.offset += 4
    return value
  }

  /** Read a u64 amount. Sat amounts never exceed 2.1e15, well inside the
   *  safe-integer range, so this narrows to `number` after a bounds check. */
  readU64(): number {
    this.require(8)
    const value = this.view.getBigUint64(this.offset, true)
    this.offset += 8
    if (value > MAX_SAFE_SATS) {
      throw new DecodeError(
        `VTXO amount ${value} exceeds the safe integer range`,
        'INVALID_VTXO'
      )
    }
    return Number(value)
  }

  readBytes(length: number): Uint8Array {
    this.require(length)
    const slice = this.bytes.slice(this.offset, this.offset + length)
    this.offset += length
    return slice
  }

  readCompactSize(): number {
    const first = this.readU8()
    if (first < 0xfd) {
      return first
    }
    if (first === 0xfd) {
      return this.readU16()
    }
    if (first === 0xfe) {
      return this.readU32()
    }
    return this.readU64()
  }
}

/** Byte-reversed hex, the display convention for txids. */
function toTxid(bytes: Uint8Array): string {
  return bytesToHex(Uint8Array.from(bytes).reverse())
}

function readPubkey(reader: Reader): Uint8Array {
  const bytes = reader.readBytes(COMPRESSED_PUBKEY_LENGTH)
  try {
    assertCompressedPubkey(bytes)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new DecodeError(
      `VTXO contains an invalid public key: ${message}`,
      'INVALID_VTXO'
    )
  }
  return bytes
}

function readOutpoint(reader: Reader): { txid: string; vout: number } {
  const txid = toTxid(reader.readBytes(TXID_LENGTH))
  const vout = reader.readU32()
  return { txid, vout }
}

/** Signatures are fixed-width: 64 zero bytes stands in for "absent". */
function readOptionalSignature(reader: Reader): string | null {
  const bytes = reader.readBytes(SCHNORR_SIGNATURE_LENGTH)
  return bytes.every((byte) => byte === 0) ? null : bytesToHex(bytes)
}

function readTxOut(reader: Reader): VtxoTxOut {
  const value = reader.readU64()
  const scriptLength = reader.readCompactSize()
  const script = reader.readBytes(scriptLength)
  return { value, scriptPubKey: bytesToHex(script) }
}

function readTransition(reader: Reader): VtxoTransition {
  const type = reader.readU8()

  if (type === GENESIS_TRANSITION_COSIGNED) {
    const count = reader.readCompactSize()
    if (count === 0) {
      throw new DecodeError(
        'VTXO has a cosigned genesis transition with an empty pubkey list',
        'INVALID_VTXO'
      )
    }
    const pubkeys: string[] = []
    for (let i = 0; i < count; i++) {
      pubkeys.push(bytesToHex(readPubkey(reader)))
    }
    return {
      kind: 'cosigned',
      pubkeys,
      signature: readOptionalSignature(reader)
    }
  }

  if (type === GENESIS_TRANSITION_ARKOOR) {
    const count = reader.readCompactSize()
    const cosigners: string[] = []
    for (let i = 0; i < count; i++) {
      cosigners.push(bytesToHex(readPubkey(reader)))
    }
    const tapTweak = reader.readBytes(SHA256_LENGTH)
    assertValidScalar(tapTweak)
    return {
      kind: 'arkoor',
      clientCosigners: cosigners,
      tapTweak: bytesToHex(tapTweak),
      signature: readOptionalSignature(reader)
    }
  }

  const isHashLocked =
    type === GENESIS_TRANSITION_HASH_LOCKED_COSIGNED ||
    type === GENESIS_TRANSITION_HASH_LOCKED_COSIGNED_V0
  if (!isHashLocked) {
    throw new DecodeError(
      `VTXO has an unknown genesis transition type: 0x${type.toString(HEX_RADIX)}`,
      'INVALID_VTXO'
    )
  }

  const userPubkey = bytesToHex(readPubkey(reader))
  const signature = readOptionalSignature(reader)
  const unlockTag = reader.readU8()
  if (unlockTag !== 0 && unlockTag !== 1) {
    throw new DecodeError(
      `VTXO has an invalid preimage tag: 0x${unlockTag.toString(HEX_RADIX)}`,
      'INVALID_VTXO'
    )
  }
  const unlockBytes = bytesToHex(reader.readBytes(SHA256_LENGTH))

  return {
    kind:
      type === GENESIS_TRANSITION_HASH_LOCKED_COSIGNED
        ? 'hash-locked-cosigned-v1'
        : 'hash-locked-cosigned',
    userPubkey,
    signature,
    // Tag 0 carries the revealed preimage; tag 1 carries only its hash.
    preimage: unlockTag === 0 ? unlockBytes : null,
    unlockHash: unlockTag === 1 ? unlockBytes : null
  }
}

const SECP256K1_ORDER = BigInt(
  '0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'
)

function assertValidScalar(bytes: Uint8Array): void {
  let value = 0n
  for (const byte of bytes) {
    // biome-ignore lint/suspicious/noBitwiseOperators: big-endian byte assembly
    value = (value << 8n) | BigInt(byte)
  }
  if (value === 0n || value >= SECP256K1_ORDER) {
    throw new DecodeError(
      'VTXO arkoor tap tweak is not a valid secp256k1 scalar',
      'INVALID_VTXO'
    )
  }
}

function readGenesisItem(reader: Reader): VtxoGenesisItem {
  const transition = readTransition(reader)
  const outputCount = reader.readU8()
  const outputIdx = reader.readU8()

  if (outputCount === 0) {
    throw new DecodeError(
      'VTXO has a genesis item with 0 outputs',
      'INVALID_VTXO'
    )
  }
  // `outputIdx` must address a real output; otherwise the VTXO's own point
  // would reference a sibling or the fee anchor instead of its own output.
  if (outputIdx >= outputCount) {
    throw new DecodeError(
      `VTXO genesis item output index ${outputIdx} is out of range (>= ${outputCount})`,
      'INVALID_VTXO'
    )
  }

  const otherOutputs: VtxoTxOut[] = []
  for (let i = 0; i < outputCount - 1; i++) {
    otherOutputs.push(readTxOut(reader))
  }

  return {
    transition,
    outputIdx,
    otherOutputs,
    feeAmount: reader.readU64(),
    isSigned: transitionIsSigned(transition)
  }
}

function transitionIsSigned(transition: VtxoTransition): boolean {
  if (transition.kind === 'cosigned' || transition.kind === 'arkoor') {
    return transition.signature !== null
  }
  // A hash-locked transition also needs the preimage to be spendable.
  return transition.signature !== null && transition.preimage !== null
}

function readPolicy(reader: Reader): VtxoPolicy {
  const type = reader.readU8()

  switch (type) {
    case POLICY_PUBKEY:
      return { kind: 'pubkey', userPubkey: bytesToHex(readPubkey(reader)) }

    case POLICY_SERVER_HTLC_SEND:
    case POLICY_SERVER_HTLC_SEND_V0:
      return {
        kind:
          type === POLICY_SERVER_HTLC_SEND
            ? 'server-htlc-send-v1'
            : 'server-htlc-send',
        userPubkey: bytesToHex(readPubkey(reader)),
        paymentHash: bytesToHex(reader.readBytes(SHA256_LENGTH)),
        htlcExpiry: reader.readU32()
      }

    case POLICY_SERVER_HTLC_RECV:
    case POLICY_SERVER_HTLC_RECV_V0:
      return {
        kind:
          type === POLICY_SERVER_HTLC_RECV
            ? 'server-htlc-receive-v1'
            : 'server-htlc-receive',
        userPubkey: bytesToHex(readPubkey(reader)),
        paymentHash: bytesToHex(reader.readBytes(SHA256_LENGTH)),
        htlcExpiry: reader.readU32(),
        htlcExpiryDelta: reader.readU16()
      }

    case POLICY_SERVER_OWNED:
      return { kind: 'server-owned' }

    case POLICY_CHECKPOINT:
      return { kind: 'checkpoint', userPubkey: bytesToHex(readPubkey(reader)) }

    case POLICY_EXPIRY:
      return {
        kind: 'expiry',
        internalKey: bytesToHex(reader.readBytes(SHA256_LENGTH))
      }

    case POLICY_HARK_LEAF:
    case POLICY_HARK_LEAF_V0:
      return {
        kind: type === POLICY_HARK_LEAF ? 'hark-leaf-v1' : 'hark-leaf',
        userPubkey: bytesToHex(readPubkey(reader)),
        unlockHash: bytesToHex(reader.readBytes(SHA256_LENGTH))
      }

    case POLICY_HARK_FORFEIT:
    case POLICY_HARK_FORFEIT_V0:
      return {
        kind: type === POLICY_HARK_FORFEIT ? 'hark-forfeit-v1' : 'hark-forfeit',
        userPubkey: bytesToHex(readPubkey(reader)),
        unlockHash: bytesToHex(reader.readBytes(SHA256_LENGTH))
      }

    default:
      throw new DecodeError(
        `VTXO has an unknown policy type byte: 0x${type.toString(HEX_RADIX)}`,
        'INVALID_VTXO'
      )
  }
}

/* -------------------------------------------------------------------------
 * Script construction
 * ---------------------------------------------------------------------- */

/** Minimal `push_int` following Bitcoin script number encoding. */
function pushInt(value: number): Uint8Array {
  const OP_1_OFFSET = 0x50
  const MAX_SMALL_INT = 16
  if (value === 0) {
    return new Uint8Array([0x00])
  }
  if (value >= 1 && value <= MAX_SMALL_INT) {
    return new Uint8Array([OP_1_OFFSET + value])
  }

  const bytes: number[] = []
  let remaining = value
  while (remaining > 0) {
    // biome-ignore lint/suspicious/noBitwiseOperators: script numbers are byte-wise
    bytes.push(remaining & 0xff)
    remaining = Math.floor(remaining / 256)
  }
  // Script numbers are signed; a high bit in the top byte needs a zero pad.
  const HIGH_BIT = 0x80
  const top = bytes.at(-1) as number
  // biome-ignore lint/suspicious/noBitwiseOperators: sign-bit test on a script number
  if (top & HIGH_BIT) {
    bytes.push(0x00)
  }
  return new Uint8Array([bytes.length, ...bytes])
}

function pushBytes(data: Uint8Array): Uint8Array {
  return new Uint8Array([data.length, ...data])
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  let length = 0
  for (const chunk of chunks) {
    length += chunk.length
  }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

/** Bitcoin `Sequence::from_height` — a relative timelock in blocks. */
function sequenceFromHeight(blocks: number): number {
  return blocks
}

/** `<height> OP_CLTV OP_DROP <pubkey> OP_CHECKSIG` */
function timelockSignScript(
  height: number,
  xOnlyPubkey: Uint8Array
): Uint8Array {
  return concatBytes(
    pushInt(height),
    new Uint8Array([OP_CLTV, OP_DROP]),
    pushBytes(xOnlyPubkey),
    new Uint8Array([OP_CHECKSIG])
  )
}

/** `<delay> OP_CSV OP_DROP <pubkey> OP_CHECKSIG` */
function delayedSignScript(delay: number, xOnlyPubkey: Uint8Array): Uint8Array {
  return concatBytes(
    pushInt(sequenceFromHeight(delay)),
    new Uint8Array([OP_CSV, OP_DROP]),
    pushBytes(xOnlyPubkey),
    new Uint8Array([OP_CHECKSIG])
  )
}

/** `<height> OP_CLTV OP_DROP <delay> OP_CSV OP_DROP <pubkey> OP_CHECKSIG` */
function delayTimelockSignScript(
  delay: number,
  height: number,
  xOnlyPubkey: Uint8Array
): Uint8Array {
  return concatBytes(
    pushInt(height),
    new Uint8Array([OP_CLTV, OP_DROP]),
    pushInt(sequenceFromHeight(delay)),
    new Uint8Array([OP_CSV, OP_DROP]),
    pushBytes(xOnlyPubkey),
    new Uint8Array([OP_CHECKSIG])
  )
}

/** `OP_SIZE 32 OP_EQUALVERIFY OP_HASH160 <ripemd160(hash)> OP_EQUALVERIFY
 *  <pubkey> OP_CHECKSIG` */
function hashAndSignScript(
  unlockHash: Uint8Array,
  xOnlyPubkey: Uint8Array
): Uint8Array {
  const PREIMAGE_LENGTH = 32
  return concatBytes(
    new Uint8Array([OP_SIZE]),
    pushInt(PREIMAGE_LENGTH),
    new Uint8Array([OP_EQUALVERIFY, OP_HASH160]),
    pushBytes(ripemd160(unlockHash)),
    new Uint8Array([OP_EQUALVERIFY]),
    pushBytes(xOnlyPubkey),
    new Uint8Array([OP_CHECKSIG])
  )
}

/** `<delay> OP_CSV OP_DROP OP_SIZE 32 OP_EQUALVERIFY OP_HASH160
 *  <ripemd160(hash)> OP_EQUALVERIFY <pubkey> OP_CHECKSIG` */
function hashDelaySignScript(
  hash: Uint8Array,
  delay: number,
  xOnlyPubkey: Uint8Array
): Uint8Array {
  const PREIMAGE_LENGTH = 32
  return concatBytes(
    pushInt(sequenceFromHeight(delay)),
    new Uint8Array([OP_CSV, OP_DROP, OP_SIZE]),
    pushInt(PREIMAGE_LENGTH),
    new Uint8Array([OP_EQUALVERIFY, OP_HASH160]),
    pushBytes(ripemd160(hash)),
    new Uint8Array([OP_EQUALVERIFY]),
    pushBytes(xOnlyPubkey),
    new Uint8Array([OP_CHECKSIG])
  )
}

function p2trScript(xOnlyKey: Uint8Array): Uint8Array {
  const OP_1 = 0x51
  const PUSH_32 = 0x20
  return new Uint8Array([OP_1, PUSH_32, ...xOnlyKey])
}

/** Combine two tapleaf hashes into their parent branch, per BIP-341: the
 *  children are sorted lexicographically before hashing. */
function tapBranchHash(left: Uint8Array, right: Uint8Array): Uint8Array {
  const swap = compareByteArrays(left, right) > 0
  return taggedHash('TapBranch', swap ? right : left, swap ? left : right)
}

function compareByteArrays(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const left = a[i] as number
    const right = b[i] as number
    if (left !== right) {
      return left - right
    }
  }
  return a.length - b.length
}

/** Merkle root of a taproot tree with two leaves at depth 1. */
function twoLeafRoot(first: Uint8Array, second: Uint8Array): Uint8Array {
  return tapBranchHash(tapLeafHash(first), tapLeafHash(second))
}

/** The x-only form of a compressed public key. */
function xOnlyOf(compressed: Uint8Array): Uint8Array {
  return compressed.slice(1)
}

/** Derive the scriptPubKey that a genesis transition spends.
 *
 *  Each transition type commits to a different taproot construction; getting
 *  any of them wrong changes the exit txid, which the `point` check catches.
 */
function transitionInputScript(
  transition: VtxoTransition,
  serverPubkey: Uint8Array,
  expiryHeight: number
): Uint8Array {
  if (transition.kind === 'arkoor') {
    // Key-path only: aggregate the client cosigners with the server key, then
    // apply the tweak stored in the blob.
    const keys = [
      ...transition.clientCosigners.map((key) => hexToBytes(key)),
      serverPubkey
    ]
    const aggregate = aggregateKeys(keys)
    const tweaked = xOnlyTweakAdd(aggregate, hexToBytes(transition.tapTweak))
    return p2trScript(toXOnly(tweaked))
  }

  if (transition.kind === 'cosigned') {
    // Aggregate cosign keys as the internal key, with a single expiry leaf
    // letting the server sweep after the VTXO expires.
    const keys = transition.pubkeys.map((key) => hexToBytes(key))
    const internalKey = toXOnly(aggregateKeys(keys))
    const leaf = timelockSignScript(expiryHeight, xOnlyOf(serverPubkey))
    return p2trScript(taprootOutputKey(internalKey, tapLeafHash(leaf)))
  }

  // Hash-locked: this is the hArk leaf policy — a user+server aggregate
  // internal key over two leaves (server expiry sweep, and a preimage unlock
  // signed by the aggregate key).
  const unlockHash = transition.preimage
    ? sha256(hexToBytes(transition.preimage))
    : hexToBytes(transition.unlockHash as string)
  const aggregate = aggregateKeys([
    hexToBytes(transition.userPubkey),
    serverPubkey
  ])
  const internalKey = toXOnly(aggregate)
  const expiryLeaf = timelockSignScript(expiryHeight, xOnlyOf(serverPubkey))
  const unlockLeaf = hashAndSignScript(unlockHash, internalKey)
  return p2trScript(
    taprootOutputKey(internalKey, twoLeafRoot(expiryLeaf, unlockLeaf))
  )
}

/** Derive the scriptPubKey a VTXO policy locks its output with.
 *
 *  This guards the final output of the exit chain, where the transition-based
 *  scripts above guard the intermediate ones.
 */
function policyScript(
  policy: VtxoPolicy,
  serverPubkey: Uint8Array,
  exitDelta: number,
  expiryHeight: number
): Uint8Array {
  const server = xOnlyOf(serverPubkey)

  if (policy.kind === 'server-owned') {
    return p2trScript(server)
  }

  if (policy.kind === 'expiry') {
    const internalKey = hexToBytes(policy.internalKey)
    const leaf = timelockSignScript(expiryHeight, server)
    return p2trScript(taprootOutputKey(internalKey, tapLeafHash(leaf)))
  }

  const user = hexToBytes(policy.userPubkey)
  const aggregate = toXOnly(aggregateKeys([user, serverPubkey]))

  switch (policy.kind) {
    case 'pubkey': {
      // Single leaf: the user claims unilaterally after the exit delay.
      const leaf = delayedSignScript(exitDelta, xOnlyOf(user))
      return p2trScript(taprootOutputKey(aggregate, tapLeafHash(leaf)))
    }

    case 'checkpoint': {
      // Single leaf: the server sweeps after expiry.
      const leaf = timelockSignScript(expiryHeight, server)
      return p2trScript(taprootOutputKey(aggregate, tapLeafHash(leaf)))
    }

    case 'server-htlc-send':
    case 'server-htlc-send-v1': {
      const DOUBLE = 2
      const serverReveals = hashDelaySignScript(
        hexToBytes(policy.paymentHash),
        exitDelta,
        server
      )
      const userClaims = delayTimelockSignScript(
        exitDelta * DOUBLE,
        policy.htlcExpiry,
        xOnlyOf(user)
      )
      return p2trScript(
        taprootOutputKey(aggregate, twoLeafRoot(serverReveals, userClaims))
      )
    }

    case 'server-htlc-receive':
    case 'server-htlc-receive-v1': {
      const serverClaims = delayTimelockSignScript(
        exitDelta,
        policy.htlcExpiry,
        server
      )
      const userReveals = hashDelaySignScript(
        hexToBytes(policy.paymentHash),
        policy.htlcExpiryDelta + exitDelta,
        xOnlyOf(user)
      )
      // bark adds the server clause first for the receive policy.
      return p2trScript(
        taprootOutputKey(aggregate, twoLeafRoot(serverClaims, userReveals))
      )
    }

    default: {
      // hArk leaf / forfeit: server expiry sweep plus an aggregate-signed
      // preimage unlock.
      const unlockHash = hexToBytes(policy.unlockHash)
      const expiryLeaf = timelockSignScript(expiryHeight, server)
      const unlockLeaf = hashAndSignScript(unlockHash, aggregate)
      return p2trScript(
        taprootOutputKey(aggregate, twoLeafRoot(expiryLeaf, unlockLeaf))
      )
    }
  }
}

/* -------------------------------------------------------------------------
 * Transaction serialization
 * ---------------------------------------------------------------------- */

function encodeU32(value: number): Uint8Array {
  const buffer = new Uint8Array(4)
  new DataView(buffer.buffer).setUint32(0, value, true)
  return buffer
}

function encodeU64(value: number): Uint8Array {
  const buffer = new Uint8Array(8)
  new DataView(buffer.buffer).setBigUint64(0, BigInt(value), true)
  return buffer
}

/** Serialize an exit transaction without witnesses and hash it to a txid.
 *
 *  Exit transactions are always version 3, locktime 0, single input with an
 *  empty scriptSig and sequence 0. Witness data is excluded because txids
 *  commit only to the non-witness serialization.
 */
function buildExitTx(
  prev: { txid: string; vout: number },
  outputs: VtxoTxOut[]
): { txid: string; hex: string } {
  const chunks: Uint8Array[] = [
    encodeU32(EXIT_TX_VERSION),
    encodeCompactSize(1),
    Uint8Array.from(hexToBytes(prev.txid)).reverse(),
    encodeU32(prev.vout),
    encodeCompactSize(0),
    encodeU32(0),
    encodeCompactSize(outputs.length)
  ]

  for (const output of outputs) {
    const script = hexToBytes(output.scriptPubKey)
    chunks.push(
      encodeU64(output.value),
      encodeCompactSize(script.length),
      script
    )
  }
  chunks.push(encodeU32(0))

  const serialized = concatBytes(...chunks)
  return {
    txid: toTxid(sha256(sha256(serialized))),
    hex: bytesToHex(serialized)
  }
}

/** Walk the genesis chain, rebuilding every exit transaction in order.
 *
 *  Each item's own output carries the running amount forward; siblings and the
 *  P2A fee anchor are spliced in around it at `outputIdx`.
 */
function buildExitChain(
  items: VtxoGenesisItem[],
  anchorPoint: { txid: string; vout: number },
  amount: number,
  policy: VtxoPolicy,
  serverPubkey: Uint8Array,
  exitDelta: number,
  expiryHeight: number
): VtxoExitStep[] {
  const steps: VtxoExitStep[] = []
  let prev = anchorPoint

  // The carried amount flows backwards: the last level pays out the VTXO's
  // amount, and each earlier level additionally covers its siblings and fee.
  const carried: number[] = []
  let running = amount
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i] as VtxoGenesisItem
    carried[i] = running
    let siblingSum = item.feeAmount
    for (const output of item.otherOutputs) {
      siblingSum += output.value
    }
    running += siblingSum
  }

  for (const [index, item] of items.entries()) {
    const ownAmount = carried[index] as number

    // An output's script is set by whatever spends it: the *next* transition
    // for intermediate levels, and the VTXO's own policy for the last one.
    const next = items[index + 1]
    const ownScript = next
      ? transitionInputScript(next.transition, serverPubkey, expiryHeight)
      : policyScript(policy, serverPubkey, exitDelta, expiryHeight)

    const own: VtxoTxOut = {
      value: ownAmount,
      scriptPubKey: bytesToHex(ownScript)
    }

    const outputs: VtxoTxOut[] = [
      ...item.otherOutputs.slice(0, item.outputIdx),
      own,
      ...item.otherOutputs.slice(item.outputIdx),
      { value: item.feeAmount, scriptPubKey: P2A_SCRIPT_HEX }
    ]

    const { txid, hex } = buildExitTx(prev, outputs)
    let outputSum = 0
    for (const output of outputs) {
      outputSum += output.value
    }

    steps.push({
      txid,
      hex,
      vout: item.outputIdx,
      inputAmount: outputSum,
      outputAmount: ownAmount,
      feeAmount: item.feeAmount,
      isSigned: item.isSigned
    })

    prev = { txid, vout: item.outputIdx }
  }

  return steps
}

/** Decode a bark VTXO from its hex encoding.
 *
 *  @param input - Hex-encoded VTXO (with or without a `0x` prefix).
 *  @returns The decoded VTXO, including its reconstructed exit chain.
 *  @throws {DecodeError} When the input is not a well-formed v2 VTXO.
 */
export function vtxo(input: string): VtxoData {
  const trimmed = input.trim().replace(HEX_PREFIX_PATTERN, '')

  if (trimmed.length === 0) {
    throw new DecodeError('VTXO input is empty', 'INVALID_VTXO')
  }
  if (trimmed.length % 2 !== 0) {
    throw new DecodeError(
      'VTXO input has an odd number of hex digits',
      'INVALID_VTXO'
    )
  }
  if (!HEX_PATTERN.test(trimmed)) {
    throw new DecodeError('VTXO input is not valid hex', 'INVALID_VTXO')
  }

  const reader = new Reader(hexToBytes(trimmed.toLowerCase()))

  const version = reader.readU16()
  if (version !== VTXO_ENCODING_VERSION) {
    const detail =
      version === VTXO_NO_FEE_AMOUNT_VERSION
        ? ' (legacy encoding without genesis fee amounts)'
        : ''
    throw new DecodeError(
      `Unsupported VTXO encoding version ${version}${detail}; expected ${VTXO_ENCODING_VERSION}`,
      'UNSUPPORTED_VTXO_VERSION'
    )
  }

  const amount = reader.readU64()
  const expiryHeight = reader.readU32()
  const serverPubkey = readPubkey(reader)
  const exitDelta = reader.readU16()
  const anchorPoint = readOutpoint(reader)

  const itemCount = reader.readCompactSize()
  const items: VtxoGenesisItem[] = []
  for (let i = 0; i < itemCount; i++) {
    items.push(readGenesisItem(reader))
  }

  const policy = readPolicy(reader)
  const point = readOutpoint(reader)

  if (reader.remaining !== 0) {
    throw new DecodeError(
      `VTXO has ${reader.remaining} unexpected trailing byte(s)`,
      'INVALID_VTXO'
    )
  }

  // A VTXO whose point equals its anchor is a virtual representation of an
  // on-chain UTXO and carries no genesis items; anything else must have them.
  const isVirtualUtxo =
    point.txid === anchorPoint.txid && point.vout === anchorPoint.vout
  if (isVirtualUtxo && items.length > 0) {
    throw new DecodeError(
      'VTXO represents an on-chain UTXO but carries genesis items',
      'INVALID_VTXO'
    )
  }
  if (!isVirtualUtxo && items.length === 0) {
    throw new DecodeError('VTXO has no genesis item data', 'INVALID_VTXO')
  }

  const exitChain = isVirtualUtxo
    ? []
    : buildExitChain(
        items,
        anchorPoint,
        amount,
        policy,
        serverPubkey,
        exitDelta,
        expiryHeight
      )

  let totalFees = 0
  let isFullySigned = true
  for (const item of items) {
    totalFees += item.feeAmount
    if (!item.isSigned) {
      isFullySigned = false
    }
  }

  return {
    version,
    vtxoId: `${point.txid}:${point.vout}`,
    amount,
    expiryHeight,
    serverPubkey: bytesToHex(serverPubkey),
    exitDelta,
    anchorPoint,
    point,
    policy,
    genesis: items,
    exitChain,
    totalFees,
    chainDepth: items.length,
    isFullySigned,
    isVirtualUtxo
  }
}

/** Heuristic check that a string plausibly encodes a v2 VTXO.
 *
 *  VTXOs carry no magic bytes, so this checks the smallest set of structural
 *  invariants that a v2 blob must satisfy: a plausible length, the version
 *  word, and a compressed-pubkey prefix where the server key belongs.
 */
export function isVtxo(input: string): boolean {
  const trimmed = input.trim().replace(HEX_PREFIX_PATTERN, '')
  const MIN_VTXO_HEX_LENGTH =
    2 * (2 + 8 + 4 + COMPRESSED_PUBKEY_LENGTH + 2 + OUTPOINT_LENGTH)

  if (trimmed.length < MIN_VTXO_HEX_LENGTH || trimmed.length % 2 !== 0) {
    return false
  }
  if (!HEX_PATTERN.test(trimmed)) {
    return false
  }

  const bytes = hexToBytes(trimmed.toLowerCase())
  const version = bytes[0] as number
  const versionHigh = bytes[1] as number
  if (version !== VTXO_ENCODING_VERSION || versionHigh !== 0) {
    return false
  }

  // Byte 14 starts the server pubkey, right after version+amount+expiry.
  const SERVER_PUBKEY_OFFSET = 14
  const prefix = bytes[SERVER_PUBKEY_OFFSET]
  return prefix === 2 || prefix === 3
}
