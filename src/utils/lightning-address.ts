import type { ParsedDestination, ParsedLNAddress, WellKnown } from '../types'
import { DecodeError } from '../types'

const BASE_URL = 'https://'
const FETCH_TIMEOUT_MS = 5000

function parse(input: string): ParsedLNAddress {
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

  return {
    username: username.toLowerCase(),
    domain: domain.toLowerCase()
  }
}

function endpoint(parsed: ParsedLNAddress): string {
  return `${BASE_URL}${parsed.domain}/.well-known/lnurlp/${parsed.username}`
}

// No request headers: a `Content-Type` on a bodyless GET makes the request
// non-simple, and the CORS preflight it triggers is rejected by hosts that
// only implement GET on the well-known path.
async function fetchWellKnown(url: string): Promise<WellKnown | null> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new DecodeError(
        `Lightning address request timed out after ${FETCH_TIMEOUT_MS}ms`,
        'LNADDRESS_UNREACHABLE'
      )
    }
    const message =
      error instanceof Error ? error.message : 'Unknown network error'
    throw new DecodeError(
      `Lightning address fetch failed: ${message}`,
      'LNADDRESS_UNREACHABLE'
    )
  }

  let json: Record<string, unknown>
  try {
    json = (await response.json()) as Record<string, unknown>
  } catch {
    return null
  }

  const { callback, minSendable, maxSendable, commentAllowed, metadata } = json

  if (!(callback && minSendable && maxSendable)) {
    return null
  }

  return {
    callback,
    minSendable,
    maxSendable,
    commentAllowed,
    metadata
  } as WellKnown
}

async function lightningAddress(input: string): Promise<ParsedDestination> {
  const parsed = parse(input)
  const value = `${parsed.username}@${parsed.domain}`
  const result = await fetchWellKnown(endpoint(parsed))

  if (!result) {
    throw new DecodeError(
      `Lightning address not found: ${input}`,
      'INVALID_LNADDRESS'
    )
  }

  return {
    destination: {
      value,
      protocol: 'lightning',
      type: 'lnaddress'
    }
  }
}

// Resolves to `null` for anything that is not a usable payRequest, including
// an unreachable host. Use `lightningAddress` to tell those cases apart.
async function wellKnown(
  lnaddress: string,
  needsParse = true
): Promise<WellKnown | null> {
  let url = lnaddress

  if (needsParse) {
    try {
      url = endpoint(parse(lnaddress))
    } catch {
      return null
    }
  }

  try {
    return await fetchWellKnown(url)
  } catch {
    return null
  }
}

export { lightningAddress, parse, wellKnown }
