import type {
  Input,
  ParsedDestination,
  ParsedLNAddress,
  WellKnown
} from '../types'
import { DecodeError } from '../types'

const BASE_URL = 'https://'

const headers = { 'Content-Type': 'application/json' }

function parse(input: Input): ParsedLNAddress {
  const atIndex = input.indexOf('@')

  if (atIndex < 1) {
    throw new DecodeError(
      'Invalid lightning address format',
      'INVALID_LNADDRESS'
    )
  }

  const username = input.slice(0, atIndex)
  const domain = input.slice(atIndex + 1)

  if (!domain.includes('.')) {
    throw new DecodeError(
      'Invalid lightning address format',
      'INVALID_LNADDRESS'
    )
  }

  return { username, domain }
}

function lightningAddress(input: Input): ParsedDestination {
  parse(input)

  return {
    destination: {
      value: input,
      protocol: 'lightning',
      type: 'lnaddress'
    }
  }
}

async function wellKnown(
  lnaddress: string,
  needsParse = true
): Promise<WellKnown | false> {
  let url = lnaddress

  if (needsParse) {
    try {
      const parsed = parse(lnaddress)
      url = `${BASE_URL}${parsed.domain}/.well-known/lnurlp/${parsed.username}`
    } catch {
      return false
    }
  }

  try {
    const response = await fetch(url, {
      headers,
      method: 'GET'
    })
    const json = (await response.json()) as Record<string, unknown>

    const { callback, minSendable, maxSendable, commentAllowed, metadata } =
      json

    if (!callback) {
      return false
    }

    if (!minSendable) {
      return false
    }

    if (!maxSendable) {
      return false
    }

    return {
      callback,
      minSendable,
      maxSendable,
      commentAllowed,
      metadata
    } as WellKnown
  } catch {
    return false
  }
}

export { lightningAddress, parse, wellKnown }
