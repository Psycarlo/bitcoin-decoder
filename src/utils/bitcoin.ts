import { sha256 } from '@noble/hashes/sha2.js'
import { bech32, bech32m, createBase58check } from '@scure/base'
import type { BitcoinAddressType, Input, ParsedDestination } from '../types'
import { DecodeError } from '../types'

const b58c = createBase58check(sha256)

const SEGWIT_HRPS = ['bc', 'tb', 'bcrt'] as const
const BITCOIN_ADDRESS_PREFIXES = [
  'bc1',
  'tb1',
  'bcrt1',
  '1',
  '3',
  'm',
  'n',
  '2'
]

const P2PKH_VERSIONS = new Set([0x00, 0x6f])
const P2SH_VERSIONS = new Set([0x05, 0xc4])

function getAddressType(version: number): BitcoinAddressType {
  if (P2PKH_VERSIONS.has(version)) {
    return 'p2pkh'
  }
  if (P2SH_VERSIONS.has(version)) {
    return 'p2sh'
  }
  throw new DecodeError(`Unknown version byte: ${version}`, 'INVALID_VERSION')
}

function validateLegacy(input: Input): BitcoinAddressType {
  let decoded: Uint8Array

  try {
    decoded = b58c.decode(input)
  } catch {
    throw new DecodeError('Invalid base58check checksum', 'INVALID_CHECKSUM')
  }

  if (decoded.length !== 21) {
    throw new DecodeError('Invalid address length', 'PAYLOAD_TOO_SHORT')
  }

  const version = decoded[0]
  if (version === undefined) {
    throw new DecodeError('Empty address', 'EMPTY_ADDRESS')
  }

  return getAddressType(version)
}

function isValidHrp(prefix: string): boolean {
  return (SEGWIT_HRPS as readonly string[]).includes(prefix)
}

function getSegwitAddressType(
  version: number,
  programLength: number
): BitcoinAddressType {
  if (version === 0) {
    return programLength === 20 ? 'p2wpkh' : 'p2wsh'
  }

  return 'p2tr'
}

function validateSegwit(input: Input): BitcoinAddressType {
  const lowerInput = input.toLowerCase()

  // Try bech32 (witness version 0)
  try {
    const decoded = bech32.decode(lowerInput as `${string}1${string}`, 90)

    if (!isValidHrp(decoded.prefix)) {
      throw new DecodeError(`Invalid HRP: ${decoded.prefix}`, 'INVALID_HRP')
    }

    const [version] = decoded.words
    if (version !== 0) {
      throw new DecodeError(
        'Witness v0 must use bech32 encoding',
        'INVALID_VERSION'
      )
    }

    const data = bech32.fromWords(decoded.words.slice(1))
    if (data.length !== 20 && data.length !== 32) {
      throw new DecodeError(
        `Invalid witness program length: ${data.length}`,
        'PAYLOAD_TOO_SHORT'
      )
    }

    return getSegwitAddressType(version, data.length)
  } catch (error) {
    if (error instanceof DecodeError) {
      throw error
    }
  }

  // Try bech32m (witness version 1+)
  try {
    const decoded = bech32m.decode(lowerInput as `${string}1${string}`, 90)

    if (!isValidHrp(decoded.prefix)) {
      throw new DecodeError(`Invalid HRP: ${decoded.prefix}`, 'INVALID_HRP')
    }

    const [version] = decoded.words
    if (version === undefined || version < 1 || version > 16) {
      throw new DecodeError(
        `Invalid witness version: ${version}`,
        'INVALID_VERSION'
      )
    }

    const data = bech32m.fromWords(decoded.words.slice(1))

    if (version === 1) {
      if (data.length !== 32) {
        throw new DecodeError(
          `Invalid witness program length: ${data.length}`,
          'PAYLOAD_TOO_SHORT'
        )
      }
      return getSegwitAddressType(version, data.length)
    }

    // Future witness versions (2-16): program must be 2-40 bytes
    if (data.length < 2 || data.length > 40) {
      throw new DecodeError(
        `Invalid witness program length: ${data.length}`,
        'PAYLOAD_TOO_SHORT'
      )
    }

    return getSegwitAddressType(version, data.length)
  } catch (error) {
    if (error instanceof DecodeError) {
      throw error
    }
    throw new DecodeError('Invalid bech32/bech32m checksum', 'INVALID_CHECKSUM')
  }
}

function validate(input: Input): BitcoinAddressType {
  const lowerInput = input.toLowerCase()

  if (SEGWIT_HRPS.some((hrp) => lowerInput.startsWith(`${hrp}1`))) {
    return validateSegwit(input)
  }

  return validateLegacy(input)
}

function bitcoin(input: Input): ParsedDestination {
  const addressType = validate(input)

  return {
    destination: {
      value: input,
      protocol: 'on-chain',
      type: 'bitcoin-address',
      addressType
    }
  }
}

export { bitcoin, BITCOIN_ADDRESS_PREFIXES }
