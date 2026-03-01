import { bech32, hex, utf8 } from '@scure/base'
import type { Input, ParsedDestination } from '../types'

const BECH32_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

// BOLT12 TLV types from the spec
const TLV_TYPES: Record<number, string> = {
  2: 'offer_chains',
  4: 'offer_metadata',
  6: 'offer_currency',
  8: 'offer_amount',
  10: 'description',
  12: 'offer_features',
  14: 'offer_absolute_expiry',
  16: 'offer_paths',
  18: 'issuer',
  20: 'offer_quantity_max',
  22: 'node_id',
  80: 'invreq_metadata',
  82: 'invreq_payer_id',
  160: 'invoice_paths',
  162: 'invoice_blindedpay',
  164: 'invoice_created_at',
  166: 'invoice_relative_expiry',
  168: 'invoice_payment_hash',
  170: 'invoice_amount',
  172: 'invoice_fallbacks',
  174: 'invoice_features',
  176: 'invoice_node_id',
  240: 'signature'
}

type DecodedOffer = {
  offerRequest: string
  sections: { name: string; value: unknown }[]
}

/** Read a BigSize integer (variable-length encoding from the Lightning spec). */
function readBigSize(data: Uint8Array, offset: number): [number, number] {
  const first = data[offset]
  if (first === undefined) {
    throw new Error('Unexpected end of data')
  }

  if (first < 0xfd) {
    return [first, offset + 1]
  }
  if (first === 0xfd) {
    return [(data[offset + 1] ?? 0) * 256 + (data[offset + 2] ?? 0), offset + 3]
  }
  if (first === 0xfe) {
    return [
      (data[offset + 1] ?? 0) * 16_777_216 +
        (data[offset + 2] ?? 0) * 65_536 +
        (data[offset + 3] ?? 0) * 256 +
        (data[offset + 4] ?? 0),
      offset + 5
    ]
  }
  throw new Error('BigSize value too large')
}

function parseValue(type: number, value: Uint8Array): unknown {
  const name = TLV_TYPES[type]

  switch (name) {
    case 'description':
    case 'issuer':
    case 'offer_currency':
      return utf8.encode(value)
    case 'node_id':
    case 'offer_metadata':
    case 'invreq_metadata':
    case 'invreq_payer_id':
    case 'invoice_payment_hash':
    case 'invoice_node_id':
    case 'signature':
      return hex.encode(value)
    case 'offer_amount':
    case 'offer_quantity_max':
    case 'offer_absolute_expiry':
    case 'invoice_created_at':
    case 'invoice_relative_expiry':
    case 'invoice_amount': {
      let n = 0
      for (const byte of value) {
        n = n * 256 + byte
      }
      return n
    }
    case 'offer_chains': {
      const chains: string[] = []
      for (let i = 0; i < value.length; i += 32) {
        chains.push(hex.encode(value.slice(i, i + 32)))
      }
      return chains
    }
    default:
      return hex.encode(value)
  }
}

/**
 * Decode bech32 data without checksum verification.
 * BOLT12 offers use bech32 encoding but omit the checksum per spec,
 * which causes standard bech32 decoders to reject them.
 */
function decodeBech32NoChecksum(str: string): number[] {
  const lower = str.toLowerCase()
  const sepIndex = lower.lastIndexOf('1')
  if (sepIndex < 1) {
    throw new Error('Invalid bech32 string')
  }

  const dataStr = lower.slice(sepIndex + 1)
  const words: number[] = []
  for (const char of dataStr) {
    const idx = BECH32_ALPHABET.indexOf(char)
    if (idx === -1) {
      throw new Error(`Invalid bech32 character: ${char}`)
    }
    words.push(idx)
  }

  return words
}

function decode(offerRequest: string): DecodedOffer {
  if (typeof offerRequest !== 'string') {
    throw new Error('Offer request must be a string')
  }

  const lower = offerRequest.toLowerCase()
  if (!lower.startsWith('ln')) {
    throw new Error('Invalid BOLT12 offer request')
  }

  // Try standard bech32 decode first (handles offers with valid checksum),
  // then fall back to no-checksum decode (e.g. Phoenix wallet offers)
  let words: number[]
  const decoded = bech32.decodeUnsafe(offerRequest, Number.MAX_SAFE_INTEGER)
  if (decoded) {
    words = Array.from(decoded.words)
  } else {
    words = decodeBech32NoChecksum(offerRequest)
  }

  // Convert 5-bit words to bytes
  const data = bech32.fromWordsUnsafe(words)
  if (!data) {
    throw new Error('Failed to convert bech32 words to bytes')
  }

  // Parse byte-level TLV records (BigSize type + BigSize length + value)
  const sections: { name: string; value: unknown }[] = []
  let offset = 0

  while (offset < data.length) {
    const [type, afterType] = readBigSize(data, offset)
    const [length, afterLength] = readBigSize(data, afterType)
    const value = data.slice(afterLength, afterLength + length)
    offset = afterLength + length

    const name = TLV_TYPES[type] ?? `unknown_${type}`
    sections.push({
      name,
      value: parseValue(type, value)
    })
  }

  return { offerRequest, sections }
}

function getSection(
  decodedOffer: DecodedOffer,
  name: string
): { name: string; value: unknown } | undefined {
  return decodedOffer.sections.find((section) => section.name === name)
}

function parse(decodedOffer: DecodedOffer): ParsedDestination {
  const description = getSection(decodedOffer, 'description')

  return {
    destination: {
      value: decodedOffer.offerRequest,
      protocol: 'lightning',
      type: 'bolt12'
    },
    metadata: {
      description:
        typeof description?.value === 'string' ? description.value : undefined
    }
  }
}

function bolt12(input: Input) {
  return parse(decode(input))
}

export { bolt12 }
