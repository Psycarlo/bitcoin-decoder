/** Well-known public Nostr relays. */
export const NOSTR_RELAYS = {
  damus: 'wss://relay.damus.io',
  nosLol: 'wss://nos.lol',
  primal: 'wss://relay.primal.net',
  snort: 'wss://relay.snort.social',
  nostrBand: 'wss://relay.nostr.band'
} as const

export type NostrRelayUrl =
  | (typeof NOSTR_RELAYS)[keyof typeof NOSTR_RELAYS]
  | (string & {})

/** Default relays used when no `relays` option is supplied. */
export const DEFAULT_NOSTR_RELAYS: NostrRelayUrl[] = [
  NOSTR_RELAYS.nostrBand,
  NOSTR_RELAYS.primal,
  NOSTR_RELAYS.nosLol,
  NOSTR_RELAYS.damus,
  NOSTR_RELAYS.snort
]
