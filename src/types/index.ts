import type { NostrRelayUrl } from '../constants/nostr-relays'

export type Input = string

/** Bitcoin network
 *
 *  `testnet` here includes bitcoin testnet, signet, and regtest.
 */
export type Network = 'mainnet' | 'testnet' | 'unknown'

export type Protocol = 'on-chain' | 'lightning' | 'ark'

export type Metadata = {
  /** Amount in sats */
  amount?: number
  description?: string
}

export type DestinationType =
  | 'bitcoin-address'
  | 'bolt11'
  | 'bolt12'
  | 'lnurl'
  | 'lnaddress'
  | 'ark-address'

export type BitcoinAddressType = 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr'

export type Destination =
  | {
      destination: string
      type: 'bitcoin-address'
      protocol: Protocol
      addressType: BitcoinAddressType
    }
  | {
      destination: string
      type: Exclude<DestinationType, 'bitcoin-address'>
      protocol: Protocol
    }

export type ErrorCode =
  | 'UNKNOWN_FORMAT'
  | 'INVALID_HRP'
  | 'INVALID_VERSION'
  | 'EMPTY_ADDRESS'
  | 'PAYLOAD_TOO_SHORT'
  | 'INVALID_CHECKSUM'
  | 'INVALID_BOLT12'
  | 'INVALID_BIP321'
  | 'INVALID_LNADDRESS'
  | 'INVALID_LNURL'
  | 'INVALID_NIP19'
  | 'NO_PAYMENT_METHODS'

export type NostrProfile = {
  name?: string
  displayName?: string
  about?: string
  picture?: string
  banner?: string
  nip05?: string
  lud06?: string
  lud16?: string
  website?: string
  bot?: boolean
}

export type ProfileFetchResult =
  | { status: 'ok'; data: NostrProfile }
  | { status: 'not-found' }
  | { status: 'timeout' }
  | { status: 'error'; message: string }

export type NostrEntity =
  | {
      type: 'npub'
      data: { hex: string; profile?: ProfileFetchResult }
    }
  | { type: 'nsec' | 'note'; data: { hex: string } }
  | {
      type: 'nprofile'
      data: {
        pubkey: string
        relays: string[]
        profile?: ProfileFetchResult
      }
    }
  | {
      type: 'nevent'
      data: {
        id: string
        relays: string[]
        author?: string
        kind?: number
      }
    }
  | {
      type: 'naddr'
      data: {
        identifier: string
        relays: string[]
        author: string
        kind: number
      }
    }

export type NostrDecodeOptions = {
  /** When true, fetch kind 0 metadata for npub/nprofile inputs. Default false. */
  fetchProfile?: boolean
  /** Relays to query. Defaults to a small public set. */
  relays?: NostrRelayUrl[]
  /** Max time to wait for events across all relays, in ms. Default 5000. */
  timeout?: number
  /** When true, verify schnorr signature of profile event. Default true. */
  verify?: boolean
}

export type DecodeOptions = {
  nostr?: NostrDecodeOptions
}

export type ParsedLNAddress = {
  username: string
  domain: string
}

export type WellKnown = {
  callback: string
  minSendable: number
  maxSendable: number
  commentAllowed?: number
  metadata?: string
}

export type DecodedPayment = {
  valid: true
  /** Category of decoded entity. Discriminator for future kinds (nostr, transaction, psbt, key, identifier). */
  kind: 'payment'
  /** Raw text passed by the user */
  input: Input
  /** All parsed destinations */
  destinations: Destination[]
  /** Shortcut primary destination for convenience. Lightning > Ark > On-chain */
  readonly destination: Destination
  /** Bitcoin network associated with the destination(s) */
  network: Network
  /** Most relevant metadata */
  metadata?: Metadata
}

export type DecodedError = {
  valid: false
  /** Raw text passed by the user */
  input: Input
  errorMessage: string
  errorCode: ErrorCode
}

export type DecodedNostr = {
  valid: true
  kind: 'nostr'
  /** Raw text passed by the user */
  input: Input
  /** Decoded NIP-19 entity */
  entity: NostrEntity
}

export type DecodedData = DecodedPayment | DecodedNostr | DecodedError

export class DecodeError extends Error {
  code: ErrorCode

  constructor(message: string, code: ErrorCode) {
    super(message)
    this.code = code
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

export type ParsedDestination = {
  destination: DistributiveOmit<Destination, 'destination'> & {
    value: string
  }
  metadata?: Metadata
}
