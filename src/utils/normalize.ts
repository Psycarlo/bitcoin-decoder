const LOWERCASE_DESTINATION_PREFIXES = [
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

function isBech32(value: string): boolean {
  const lower = value.toLowerCase()
  return LOWERCASE_DESTINATION_PREFIXES.some((prefix) =>
    lower.startsWith(prefix)
  )
}

function normalizeDestinationValue(value: string): string {
  return isBech32(value) ? value.toLowerCase() : value
}

function normalizeHex(value: string): string {
  return value.toLowerCase()
}

export { isBech32, normalizeDestinationValue, normalizeHex }
