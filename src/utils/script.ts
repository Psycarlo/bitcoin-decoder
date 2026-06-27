import { sha256 } from '@noble/hashes/sha2.js'
import { bech32, bech32m, createBase58check } from '@scure/base'
import type {
  BitcoinAddressType,
  ScriptPubKeyType,
  TransactionNetwork
} from '../types'

const b58c = createBase58check(sha256)

const OP_DUP = 0x76
const OP_HASH160 = 0xa9
const OP_EQUAL = 0x87
const OP_EQUALVERIFY = 0x88
const OP_CHECKSIG = 0xac
const OP_CHECKMULTISIG = 0xae
const OP_RETURN = 0x6a
const OP_0 = 0x00
const OP_1 = 0x51
const OP_16 = 0x60

const PUSH_20 = 0x14
const PUSH_32 = 0x20

const P2PKH_VERSIONS: Record<TransactionNetwork, number> = {
  mainnet: 0x00,
  testnet: 0x6f,
  signet: 0x6f,
  regtest: 0x6f
}

const P2SH_VERSIONS: Record<TransactionNetwork, number> = {
  mainnet: 0x05,
  testnet: 0xc4,
  signet: 0xc4,
  regtest: 0xc4
}

const SEGWIT_HRPS: Record<TransactionNetwork, string> = {
  mainnet: 'bc',
  testnet: 'tb',
  signet: 'tb',
  regtest: 'bcrt'
}

export type DecodedScript = {
  scriptPubKeyType: ScriptPubKeyType
  address?: string
  addressType?: BitcoinAddressType
}

function encodeBase58Address(hash: Uint8Array, version: number): string {
  const payload = new Uint8Array(hash.length + 1)
  payload[0] = version
  payload.set(hash, 1)
  return b58c.encode(payload)
}

function encodeSegwitAddress(
  witnessVersion: number,
  program: Uint8Array,
  network: TransactionNetwork
): string {
  const hrp = SEGWIT_HRPS[network]
  const words = [witnessVersion, ...bech32.toWords(program)]
  const encoder = witnessVersion === 0 ? bech32 : bech32m
  return encoder.encode(hrp, words, false)
}

function isP2pkh(script: Uint8Array): boolean {
  return (
    script.length === 25 &&
    script[0] === OP_DUP &&
    script[1] === OP_HASH160 &&
    script[2] === PUSH_20 &&
    script[23] === OP_EQUALVERIFY &&
    script[24] === OP_CHECKSIG
  )
}

function isP2sh(script: Uint8Array): boolean {
  return (
    script.length === 23 &&
    script[0] === OP_HASH160 &&
    script[1] === PUSH_20 &&
    script[22] === OP_EQUAL
  )
}

function isP2pk(script: Uint8Array): boolean {
  return (
    (script.length === 35 &&
      script[0] === 0x21 &&
      script[34] === OP_CHECKSIG) ||
    (script.length === 67 && script[0] === 0x41 && script[66] === OP_CHECKSIG)
  )
}

function isWitnessProgram(script: Uint8Array): boolean {
  if (script.length < 4 || script.length > 42) {
    return false
  }
  const version = script[0] ?? -1
  const isVersionOpcode =
    version === OP_0 || (version >= OP_1 && version <= OP_16)
  return isVersionOpcode && script[1] === script.length - 2
}

function witnessVersionFromOpcode(opcode: number): number {
  return opcode === OP_0 ? 0 : opcode - (OP_1 - 1)
}

function decodeWitness(
  script: Uint8Array,
  network: TransactionNetwork
): DecodedScript {
  const witnessVersion = witnessVersionFromOpcode(script[0] as number)
  const program = script.slice(2)

  if (witnessVersion === 0) {
    if (program.length === PUSH_20) {
      return {
        scriptPubKeyType: 'v0_p2wpkh',
        address: encodeSegwitAddress(0, program, network),
        addressType: 'p2wpkh'
      }
    }
    if (program.length === PUSH_32) {
      return {
        scriptPubKeyType: 'v0_p2wsh',
        address: encodeSegwitAddress(0, program, network),
        addressType: 'p2wsh'
      }
    }
    return { scriptPubKeyType: 'unknown' }
  }

  if (witnessVersion === 1 && program.length === PUSH_32) {
    return {
      scriptPubKeyType: 'v1_p2tr',
      address: encodeSegwitAddress(1, program, network),
      addressType: 'p2tr'
    }
  }

  return {
    scriptPubKeyType: 'unknown',
    address: encodeSegwitAddress(witnessVersion, program, network)
  }
}

export function decodeScriptPubKey(
  script: Uint8Array,
  network: TransactionNetwork = 'mainnet'
): DecodedScript {
  if (script.length === 0) {
    return { scriptPubKeyType: 'unknown' }
  }

  if (script[0] === OP_RETURN) {
    return { scriptPubKeyType: 'op_return' }
  }

  if (isP2pkh(script)) {
    const hash = script.slice(3, 23)
    return {
      scriptPubKeyType: 'p2pkh',
      address: encodeBase58Address(hash, P2PKH_VERSIONS[network]),
      addressType: 'p2pkh'
    }
  }

  if (isP2sh(script)) {
    const hash = script.slice(2, 22)
    return {
      scriptPubKeyType: 'p2sh',
      address: encodeBase58Address(hash, P2SH_VERSIONS[network]),
      addressType: 'p2sh'
    }
  }

  if (isWitnessProgram(script)) {
    return decodeWitness(script, network)
  }

  if (isP2pk(script)) {
    return { scriptPubKeyType: 'p2pk' }
  }

  if (script.at(-1) === OP_CHECKMULTISIG) {
    return { scriptPubKeyType: 'multisig' }
  }

  return { scriptPubKeyType: 'unknown' }
}
