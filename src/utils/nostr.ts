import { hex } from '@scure/base'
import { decode as nip19Decode } from 'nostr-tools/nip19'
import type { NostrEntity } from '../types'
import { DecodeError } from '../types'

const NOSTR_PREFIXES = [
  'npub',
  'nsec',
  'note',
  'nprofile',
  'nevent',
  'naddr'
] as const

function nostr(input: string): NostrEntity {
  let decoded: ReturnType<typeof nip19Decode>
  try {
    decoded = nip19Decode(input)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid NIP-19 encoding'
    throw new DecodeError(message, 'INVALID_NIP19')
  }

  switch (decoded.type) {
    case 'npub':
      return { type: 'npub', data: { hex: decoded.data } }
    case 'nsec':
      return { type: 'nsec', data: { hex: hex.encode(decoded.data) } }
    case 'note':
      return { type: 'note', data: { hex: decoded.data } }
    case 'nprofile':
      return {
        type: 'nprofile',
        data: {
          pubkey: decoded.data.pubkey,
          relays: decoded.data.relays ?? []
        }
      }
    case 'nevent':
      return {
        type: 'nevent',
        data: {
          id: decoded.data.id,
          relays: decoded.data.relays ?? [],
          author: decoded.data.author,
          kind: decoded.data.kind
        }
      }
    case 'naddr':
      return {
        type: 'naddr',
        data: {
          identifier: decoded.data.identifier,
          relays: decoded.data.relays ?? [],
          author: decoded.data.pubkey,
          kind: decoded.data.kind
        }
      }
    default:
      throw new DecodeError(
        `Unsupported NIP-19 entity: ${(decoded as { type: string }).type}`,
        'INVALID_NIP19'
      )
  }
}

export { nostr, NOSTR_PREFIXES }
