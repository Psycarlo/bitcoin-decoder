import { bech32 } from '@scure/base'
import type { Input, ParsedDestination } from '../types'
import { DecodeError } from '../types'

const LNURL_PREFIX = 'lnurl'

async function lnurl(input: Input): Promise<ParsedDestination> {
  let words: number[]

  try {
    const decoded = bech32.decode(input as `${string}1${string}`, 2000)

    if (decoded.prefix !== LNURL_PREFIX) {
      throw new DecodeError(
        `Invalid HRP: expected "${LNURL_PREFIX}", got "${decoded.prefix}"`,
        'INVALID_LNURL'
      )
    }

    words = decoded.words
  } catch (error) {
    if (error instanceof DecodeError) {
      throw error
    }
    throw new DecodeError('Invalid LNURL encoding', 'INVALID_LNURL')
  }

  const bytes = bech32.fromWords(words)
  const url = new TextDecoder().decode(new Uint8Array(bytes))

  if (!url.startsWith('https://')) {
    throw new DecodeError('LNURL does not contain a valid URL', 'INVALID_LNURL')
  }

  try {
    const response = await fetch(url, { method: 'GET' })
    const json = (await response.json()) as Record<string, unknown>

    if (!json.callback) {
      throw new DecodeError(
        'LNURL endpoint returned invalid response',
        'INVALID_LNURL'
      )
    }
  } catch (error) {
    if (error instanceof DecodeError) {
      throw error
    }
    throw new DecodeError(`LNURL endpoint unreachable: ${url}`, 'INVALID_LNURL')
  }

  return {
    destination: {
      value: input,
      protocol: 'lightning',
      type: 'lnurl'
    }
  }
}

export { lnurl, LNURL_PREFIX }
