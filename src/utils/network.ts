import type { Input, Network } from '../types'

const MAINNET_ADDRESS_PREFIXES = ['bc1p', 'bc1q', 'bc1', '1', '3']
const TESTNET_ADDRESS_PREFIXES = [
  'bcrt1q',
  'bcrt1p',
  'tb1q',
  'tb1p',
  'm',
  'n',
  '2'
]

const MAINNET_BOLT11_PREFIXES = ['lnbc']
const TESTNET_BOLT11_PREFIXES = ['lnbcrt', 'lntbs', 'lntb']

const MAINNET_BOLT12_PREFIXES = ['lno1']
const TESTNET_BOLT12_PREFIXES = ['lnbcrto1', 'lnto1']

const MAINNET_ARK_PREFIXES = ['ark']
const TESTNET_ARK_PREFIXES = ['tark']

function startsWithAny(input: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => input.startsWith(prefix))
}

function getNetwork(input: Input): Network | undefined {
  const lowerInput = input.toLowerCase()

  if (startsWithAny(lowerInput, TESTNET_ADDRESS_PREFIXES)) {
    return 'testnet'
  }
  if (startsWithAny(lowerInput, MAINNET_ADDRESS_PREFIXES)) {
    return 'mainnet'
  }

  if (startsWithAny(lowerInput, TESTNET_BOLT11_PREFIXES)) {
    return 'testnet'
  }
  if (startsWithAny(lowerInput, MAINNET_BOLT11_PREFIXES)) {
    return 'mainnet'
  }

  if (startsWithAny(lowerInput, TESTNET_BOLT12_PREFIXES)) {
    return 'testnet'
  }
  if (startsWithAny(lowerInput, MAINNET_BOLT12_PREFIXES)) {
    return 'mainnet'
  }

  if (startsWithAny(lowerInput, TESTNET_ARK_PREFIXES)) {
    return 'testnet'
  }
  if (startsWithAny(lowerInput, MAINNET_ARK_PREFIXES)) {
    return 'mainnet'
  }

  return undefined
}

export { getNetwork }
