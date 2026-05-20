import { hex } from '@scure/base'
import { npubEncode } from 'nostr-tools/nip19'
import type { Event } from 'nostr-tools/pure'
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure'

const TEST_SECRET_KEY = hex.decode(
  '0000000000000000000000000000000000000000000000000000000000000001'
)

const TEST_PUBKEY = getPublicKey(TEST_SECRET_KEY)
const TEST_NPUB = npubEncode(TEST_PUBKEY)

const VALID_CONTENT = {
  name: 'alice',
  display_name: 'Alice',
  about: 'test bio',
  picture: 'https://example.com/alice.png',
  banner: 'https://example.com/banner.png',
  nip05: 'alice@example.com',
  lud06: 'lnurl1aliceold',
  lud16: 'alice@wallet.example',
  website: 'https://alice.example',
  bot: false
}

function buildEvent(content: unknown, createdAt: number): Event {
  return finalizeEvent(
    {
      kind: 0,
      created_at: createdAt,
      tags: [],
      content: JSON.stringify(content)
    },
    TEST_SECRET_KEY
  )
}

const NOW = Math.floor(Date.now() / 1000)

const validEvent = buildEvent(VALID_CONTENT, NOW)
const oldEvent = buildEvent({ name: 'old-alice' }, NOW - 86_400)
const newerEvent = buildEvent({ name: 'newest-alice' }, NOW + 60)
function clone(event: Event): Event {
  return JSON.parse(JSON.stringify(event)) as Event
}

const malformedContent: Event = { ...clone(validEvent), content: '{not json' }
const badSig: Event = { ...clone(validEvent), sig: '0'.repeat(128) }

export const nostrProfileFixtures = {
  pubkey: TEST_PUBKEY,
  npub: TEST_NPUB,
  validEvent,
  validContent: VALID_CONTENT,
  oldEvent,
  newerEvent,
  malformedContent,
  badSig
}
