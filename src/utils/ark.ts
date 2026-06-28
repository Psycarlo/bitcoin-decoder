import { bech32m } from '@scure/base'
import type { ParsedDestination } from '../types'
import { DecodeError } from '../types'
import { normalizeDestinationValue } from './normalize'

const ARK_PREFIXES = ['ark', 'tark']
const VALID_VERSIONS = [0, 1]
const MIN_PAYLOAD_LENGTH = 4

function validate(input: string): void {
  const normalized = normalizeDestinationValue(input)
  let prefix: string
  let words: number[]

  try {
    const decoded = bech32m.decode(normalized as `${string}1${string}`, 1023)
    prefix = decoded.prefix
    words = decoded.words
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new DecodeError(`Invalid ark address: ${message}`, 'INVALID_CHECKSUM')
  }

  if (!ARK_PREFIXES.includes(prefix)) {
    throw new DecodeError(`Invalid HRP: ${prefix}`, 'INVALID_HRP')
  }

  const [version] = words

  if (version === undefined) {
    throw new DecodeError('Empty address', 'EMPTY_ADDRESS')
  }

  if (!VALID_VERSIONS.includes(version)) {
    throw new DecodeError(`Unknown version: ${version}`, 'INVALID_VERSION')
  }

  const payloadBits = (words.length - 1) * 5
  const payloadBytes = Math.floor(payloadBits / 8)

  if (payloadBytes < MIN_PAYLOAD_LENGTH) {
    throw new DecodeError('Payload too short', 'PAYLOAD_TOO_SHORT')
  }
}

function ark(input: string): ParsedDestination {
  validate(input)

  return {
    destination: {
      value: normalizeDestinationValue(input),
      protocol: 'ark',
      type: 'ark-address'
    }
  }
}

export { ark, ARK_PREFIXES }
