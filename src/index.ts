import type {
  DecodedData,
  Destination,
  Input,
  ParsedDestination
} from './types'
import { DecodeError } from './types'
import { ARK_PREFIXES, ark } from './utils/ark'
import { bip321 } from './utils/bip-321'
import { BITCOIN_ADDRESS_PREFIXES, bitcoin } from './utils/bitcoin'
import { bolt11 } from './utils/bolt11'
import { bolt12 } from './utils/bolt12'
import { getNetwork } from './utils/network'

const BIP321_PREFIX = 'bitcoin:'
const LIGHTNING_PREFIX = 'lightning:'
const BOLT11_PREFIXES = ['lnbcrt', 'lntbs', 'lnbc', 'lntb']
const BOLT12_PREFIXES = ['lnbcrto1', 'lnto1', 'lno1']

type SuccessData = Extract<DecodedData, { valid: true }>
type SuccessPayload = Omit<SuccessData, 'valid'>

function toDestination(pd: ParsedDestination['destination']): Destination {
  if (pd.type === 'bitcoin-address') {
    return {
      destination: pd.value,
      type: pd.type,
      protocol: pd.protocol,
      addressType: pd.addressType
    }
  }

  return {
    destination: pd.value,
    type: pd.type,
    protocol: pd.protocol
  }
}

function decodeBolt11(input: Input, invoice: Input): SuccessPayload {
  const parsedDestination = bolt11(invoice)
  const destination = toDestination(parsedDestination.destination)

  return {
    input,
    destination,
    destinations: [destination],
    network: getNetwork(invoice) || ' unknown',
    metadata: parsedDestination.metadata
  }
}

function decodeBolt12(input: Input, offer: Input): SuccessPayload {
  const parsedDestination = bolt12(offer)
  const destination = toDestination(parsedDestination.destination)

  return {
    input,
    destination,
    destinations: [destination],
    network: getNetwork(offer) || ' unknown',
    metadata: parsedDestination.metadata
  }
}

function decodeArk(input: Input): SuccessPayload {
  const parsedDestination = ark(input)
  const destination = toDestination(parsedDestination.destination)

  return {
    input,
    destination,
    destinations: [destination],
    network: getNetwork(input) || ' unknown'
  }
}

function decodeBip321(input: Input): SuccessPayload {
  const parsedDestinations = bip321(input)

  const first = parsedDestinations[0]
  if (!first) {
    throw new DecodeError(
      `No supported payment methods in BIP-321 URI: ${input}`,
      'NO_PAYMENT_METHODS'
    )
  }

  const destination = toDestination(first.destination)
  const destinations = parsedDestinations.map((pd) =>
    toDestination(pd.destination)
  )

  return {
    input,
    destination,
    destinations,
    network: getNetwork(destination.destination) || ' unknown',
    metadata: first.metadata
  }
}

function decodeBitcoin(input: Input): SuccessPayload {
  const parsedDestination = bitcoin(input)
  const destination = toDestination(parsedDestination.destination)

  return {
    input,
    destination,
    destinations: [destination],
    network: getNetwork(input) || ' unknown'
  }
}

function decodeInput(input: Input): SuccessPayload {
  const lowerInput = input.toLowerCase()

  if (lowerInput.startsWith(BIP321_PREFIX)) {
    return decodeBip321(input)
  }

  if (lowerInput.startsWith(LIGHTNING_PREFIX)) {
    return decodeBolt11(input, input.slice(LIGHTNING_PREFIX.length))
  }

  if (BOLT11_PREFIXES.some((prefix) => lowerInput.startsWith(prefix))) {
    return decodeBolt11(input, input)
  }

  if (BOLT12_PREFIXES.some((prefix) => lowerInput.startsWith(prefix))) {
    return decodeBolt12(input, input)
  }

  if (ARK_PREFIXES.some((prefix) => lowerInput.startsWith(prefix))) {
    return decodeArk(input)
  }

  if (
    BITCOIN_ADDRESS_PREFIXES.some((prefix) => lowerInput.startsWith(prefix))
  ) {
    return decodeBitcoin(input)
  }

  throw new DecodeError(`Unknown input format: ${input}`, 'UNKNOWN_FORMAT')
}

function getErrorCode(error: unknown): DecodedData & { valid: false } {
  if (error instanceof DecodeError) {
    return {
      valid: false,
      input: '',
      errorMessage: error.message,
      errorCode: error.code
    }
  }
  const message = error instanceof Error ? error.message : String(error)
  return {
    valid: false,
    input: '',
    errorMessage: message,
    errorCode: 'UNKNOWN_FORMAT'
  }
}

function decode(input: Input): DecodedData {
  try {
    return { valid: true, ...decodeInput(input) }
  } catch (error) {
    return { ...getErrorCode(error), input }
  }
}

export { decode }
export type { DecodedData, Destination, Metadata, Network } from './types'
export default { decode }
