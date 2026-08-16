/** MuSig2 key aggregation (BIP-327) and taproot helpers.
 *
 * Only the deterministic, public-key half of MuSig2 is implemented here: key
 * aggregation and tweaking. No nonces, no partial signatures, no randomness —
 * everything in this module is a pure function of data already present in the
 * VTXO blob. That keeps it usable in React Native, where a CSPRNG is not
 * available without a polyfill.
 */

import { secp256k1 } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'

type Point = ReturnType<typeof secp256k1.Point.fromBytes>

const COMPRESSED_PUBKEY_LENGTH = 33

/** `@noble/curves` v2 renamed the byte-oriented constructor to `fromBytes`
 *  (v1 accepted bytes in `fromHex`). Prefer `fromBytes`, fall back to
 *  `fromHex` so a consumer with a hoisted v1 still works. */
function pointFromBytes(bytes: Uint8Array): Point {
  const point = secp256k1.Point as unknown as {
    fromBytes?: (b: Uint8Array) => Point
    fromHex: (h: Uint8Array | string) => Point
  }
  return point.fromBytes ? point.fromBytes(bytes) : point.fromHex(bytes)
}

/** `@noble/curves` v2 exposes `CURVE` as a function; v1 exposed it as an
 *  object. Normalise so a hoisted v1 in a consumer's tree still works. */
function curveOrder(): bigint {
  const curve = secp256k1.Point.CURVE
  const params = typeof curve === 'function' ? curve() : curve
  return params.n
}

/** Tagged hash as defined by BIP-340: `sha256(sha256(tag) || sha256(tag) || msg)`. */
export function taggedHash(tag: string, ...messages: Uint8Array[]): Uint8Array {
  const tagHash = sha256(new TextEncoder().encode(tag))
  let length = tagHash.length * 2
  for (const message of messages) {
    length += message.length
  }

  const buffer = new Uint8Array(length)
  buffer.set(tagHash, 0)
  buffer.set(tagHash, tagHash.length)
  let offset = tagHash.length * 2
  for (const message of messages) {
    buffer.set(message, offset)
    offset += message.length
  }

  return sha256(buffer)
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n
  for (const byte of bytes) {
    // biome-ignore lint/suspicious/noBitwiseOperators: big-endian byte assembly
    result = (result << 8n) | BigInt(byte)
  }
  return result
}

/** Compare two byte arrays lexicographically, as `Ord` does in Rust. */
function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    const left = a[i] as number
    const right = b[i] as number
    if (left !== right) {
      return left - right
    }
  }
  return a.length - b.length
}

/** The BIP-327 "second key": the first pubkey in the sorted list that differs
 *  from the first one. Its coefficient is 1 rather than a hash, which is what
 *  makes plain 2-of-2 aggregation cheap. */
function findSecondKey(sortedKeys: Uint8Array[]): Uint8Array | null {
  const first = sortedKeys[0]
  if (!first) {
    return null
  }
  for (const key of sortedKeys) {
    if (compareBytes(first, key) !== 0) {
      return key
    }
  }
  return null
}

function keyAggCoefficient(
  listHash: Uint8Array,
  key: Uint8Array,
  secondKey: Uint8Array | null
): bigint {
  if (secondKey && compareBytes(key, secondKey) === 0) {
    return 1n
  }
  const hash = taggedHash('KeyAgg coefficient', listHash, key)
  return bytesToBigInt(hash) % curveOrder()
}

/** Aggregate public keys per BIP-327 KeyAgg.
 *
 *  Keys are sorted by their compressed serialization before aggregation, so
 *  input order does not matter — this mirrors bark's `musig::key_agg`.
 *
 *  @param pubkeys - Compressed 33-byte public keys.
 *  @returns The aggregate point.
 */
export function aggregateKeys(pubkeys: Uint8Array[]): Point {
  if (pubkeys.length === 0) {
    throw new Error('cannot aggregate an empty key list')
  }

  const sorted = [...pubkeys].sort(compareBytes)
  const listHash = taggedHash('KeyAgg list', ...sorted)
  const secondKey = findSecondKey(sorted)

  let aggregate: Point | null = null
  for (const key of sorted) {
    const coefficient = keyAggCoefficient(listHash, key, secondKey)
    const point = pointFromBytes(key)
    const term = coefficient === 1n ? point : point.multiply(coefficient)
    aggregate = aggregate ? aggregate.add(term) : term
  }

  if (!aggregate) {
    throw new Error('key aggregation produced no point')
  }
  return aggregate
}

/** The x-only (32-byte) serialization of a point. */
export function toXOnly(point: Point): Uint8Array {
  return point.toBytes(true).slice(1)
}

/** Apply an x-only tweak: `Q = P + t*G`, negating `P` first if it has odd Y.
 *
 *  This matches libsecp256k1's `pubkey_xonly_tweak_add`, which bark uses to
 *  apply the stored arkoor tap tweak.
 */
export function xOnlyTweakAdd(point: Point, tweak: Uint8Array): Point {
  const order = curveOrder()
  const scalar = bytesToBigInt(tweak)
  if (scalar >= order) {
    throw new Error('tweak is not a valid secp256k1 scalar')
  }

  const hasOddY = point.toBytes(true)[0] === 3
  const base = hasOddY ? point.negate() : point
  return base.add(secp256k1.Point.BASE.multiply(scalar))
}

/** Compute a BIP-341 taproot output key from an internal key and merkle root.
 *
 *  @param internalKey - x-only internal key (32 bytes).
 *  @param merkleRoot - Merkle root of the script tree, or `undefined` for a
 *    key-path-only output.
 *  @returns The x-only tweaked output key (32 bytes).
 */
export function taprootOutputKey(
  internalKey: Uint8Array,
  merkleRoot?: Uint8Array
): Uint8Array {
  const tweak = merkleRoot
    ? taggedHash('TapTweak', internalKey, merkleRoot)
    : taggedHash('TapTweak', internalKey)

  const point = pointFromBytes(new Uint8Array([2, ...internalKey]))
  return toXOnly(xOnlyTweakAdd(point, tweak))
}

/** Hash a single tapscript leaf per BIP-341 (`TapLeaf` tag, leaf version 0xc0). */
export function tapLeafHash(script: Uint8Array): Uint8Array {
  const TAPSCRIPT_LEAF_VERSION = 0xc0
  return taggedHash(
    'TapLeaf',
    new Uint8Array([TAPSCRIPT_LEAF_VERSION]),
    encodeCompactSize(script.length),
    script
  )
}

/** Minimal compact-size encoder, needed for tapleaf hashing and tx
 *  serialization. */
export function encodeCompactSize(value: number): Uint8Array {
  const UINT16_MAX = 0xff_ff
  const UINT32_MAX = 0xff_ff_ff_ff
  const SINGLE_BYTE_MAX = 0xfc

  if (value <= SINGLE_BYTE_MAX) {
    return new Uint8Array([value])
  }
  if (value <= UINT16_MAX) {
    // biome-ignore lint/suspicious/noBitwiseOperators: little-endian byte split
    return new Uint8Array([0xfd, value & 0xff, (value >> 8) & 0xff])
  }
  if (value <= UINT32_MAX) {
    const buffer = new Uint8Array(5)
    buffer[0] = 0xfe
    new DataView(buffer.buffer).setUint32(1, value, true)
    return buffer
  }
  const buffer = new Uint8Array(9)
  buffer[0] = 0xff
  new DataView(buffer.buffer).setBigUint64(1, BigInt(value), true)
  return buffer
}

/** Validate that a byte string is a well-formed compressed public key. */
export function assertCompressedPubkey(bytes: Uint8Array): void {
  if (bytes.length !== COMPRESSED_PUBKEY_LENGTH) {
    throw new Error(
      `expected a ${COMPRESSED_PUBKEY_LENGTH}-byte compressed pubkey, got ${bytes.length}`
    )
  }
  const prefix = bytes[0]
  if (prefix !== 2 && prefix !== 3) {
    throw new Error(
      `invalid compressed pubkey prefix: 0x${prefix?.toString(16)}`
    )
  }
  // Throws when the key is not on the curve.
  pointFromBytes(bytes)
}

export { COMPRESSED_PUBKEY_LENGTH }
