import { SimplePool } from 'nostr-tools/pool'
import type { Event } from 'nostr-tools/pure'
import { verifyEvent } from 'nostr-tools/pure'
import { DEFAULT_NOSTR_RELAYS } from '../constants/nostr-relays'
import type { NostrProfile, ProfileFetchResult } from '../types'

const DEFAULT_TIMEOUT_MS = 5000
const PROFILE_KIND = 0

type FetchProfileParams = {
  pubkey: string
  relays?: string[]
  timeout?: number
  verify?: boolean
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function parseProfileContent(content: string): NostrProfile | undefined {
  let json: Record<string, unknown>
  try {
    const parsed = JSON.parse(content)
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return undefined
    }
    json = parsed as Record<string, unknown>
  } catch {
    return undefined
  }

  return {
    name: asString(json.name),
    displayName: asString(json.display_name) ?? asString(json.displayName),
    about: asString(json.about),
    picture: asString(json.picture),
    banner: asString(json.banner),
    nip05: asString(json.nip05),
    lud06: asString(json.lud06),
    lud16: asString(json.lud16),
    website: asString(json.website),
    bot: asBoolean(json.bot)
  }
}

function pickNewest(events: Event[]): Event | undefined {
  let newest: Event | undefined
  for (const event of events) {
    if (!newest || event.created_at > newest.created_at) {
      newest = event
    }
  }
  return newest
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values))
}

async function fetchProfile({
  pubkey,
  relays,
  timeout = DEFAULT_TIMEOUT_MS,
  verify = true
}: FetchProfileParams): Promise<ProfileFetchResult> {
  const relayList = dedupe(
    relays && relays.length > 0 ? relays : DEFAULT_NOSTR_RELAYS
  )
  const pool = new SimplePool()

  let events: Event[]
  try {
    events = await pool.querySync(
      relayList,
      { kinds: [PROFILE_KIND], authors: [pubkey], limit: 1 },
      { maxWait: timeout }
    )
  } catch (error) {
    pool.close(relayList)
    const message =
      error instanceof Error ? error.message : 'Unknown relay error'
    return { status: 'error', message }
  } finally {
    pool.close(relayList)
  }

  if (events.length === 0) {
    return { status: 'not-found' }
  }

  const newest = pickNewest(events)
  if (!newest) {
    return { status: 'not-found' }
  }

  if (verify && !verifyEvent(newest)) {
    return { status: 'error', message: 'Invalid event signature' }
  }

  const profile = parseProfileContent(newest.content)
  if (!profile) {
    return { status: 'error', message: 'Invalid profile JSON' }
  }

  return { status: 'ok', data: profile }
}

export { fetchProfile }
