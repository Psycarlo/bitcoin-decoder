export type Input = string

/** Bitcoin network
 *
 *  `testnet` here includes bitcoin testnet, signet, and regtest.
 */
export type Network = 'mainnet' | 'testnet' | ' unknown'

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
  | 'NO_PAYMENT_METHODS'

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

type DecodedSuccess = {
  valid: true
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

type DecodedError = {
  valid: false
  /** Raw text passed by the user */
  input: Input
  errorMessage: string
  errorCode: ErrorCode
}

export type DecodedData = DecodedSuccess | DecodedError

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
