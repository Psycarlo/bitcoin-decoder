import { bech32m } from '@scure/base'
import type { Input, ParsedDestination } from '../types'
import { DecodeError } from '../types'

const ARK_PREFIXES = ['ark', 'tark']
const VALID_VERSIONS = [0, 1]
const MIN_PAYLOAD_LENGTH = 4

function validate(input: Input): void {
  let prefix: string
  let words: number[]

  try {
    const decoded = bech32m.decode(input as `${string}1${string}`, 1023)
    prefix = decoded.prefix
    words = decoded.words
  } catch {
    throw new DecodeError('Invalid bech32m checksum', 'INVALID_CHECKSUM')
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

function ark(input: Input): ParsedDestination {
  validate(input)

  return {
    destination: {
      value: input,
      protocol: 'ark',
      type: 'ark-address'
    }
  }
}

export { ark, ARK_PREFIXES }
