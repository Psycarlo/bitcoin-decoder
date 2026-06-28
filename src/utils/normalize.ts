const BECH32_DESTINATION_PREFIXES = [
  'bc1',
  'tb1',
  'bcrt1',
  'lnurl1',
  'ark1',
  'tark1',
  'lnbc',
  'lntb',
  'lntbs',
  'lnbcrt',
  'lno1',
  'lnbcrto1',
  'lnto1'
] as const

const LEGACY_BITCOIN_PREFIX = /^[13mn2]/
const BASE58_TYPE_PREFIX = /^[A-Za-z]+/

function isLightningAddress(value: string): boolean {
  const at = value.indexOf('@')
  if (at < 1) {
    return false
  }
  return value.slice(at + 1).includes('.')
}

function isBech32Destination(value: string): boolean {
  const lower = value.toLowerCase()
  return BECH32_DESTINATION_PREFIXES.some((prefix) => lower.startsWith(prefix))
}

function isBase58Destination(value: string): boolean {
  if (isBech32Destination(value) || isLightningAddress(value)) {
    return false
  }

  const legacyPrefix = LEGACY_BITCOIN_PREFIX
  if (legacyPrefix.test(value)) {
    return true
  }

  return BASE58_TYPE_PREFIX.test(value)
}

function normalizeDestinationValue(value: string): string {
  if (isBech32Destination(value) || isLightningAddress(value)) {
    return value.toLowerCase()
  }
  return value
}

function normalizeHex(value: string): string {
  return value.toLowerCase()
}

export {
  isBase58Destination,
  isBech32Destination,
  isBech32Destination as isBech32,
  isLightningAddress,
  normalizeDestinationValue,
  normalizeHex
}
