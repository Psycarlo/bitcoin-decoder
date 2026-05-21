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
  | 'INVALID_TXID'
  | 'TX_NOT_FOUND'
  | 'TX_FETCH_ERROR'
  | 'TX_TIMEOUT'

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

/** Bitcoin network for transaction lookup.
 *
 *  Note: `testnet` resolves to testnet4 (testnet3 is being deprecated).
 *  `regtest` requires an explicit endpoint override.
 */
export type TransactionNetwork = 'mainnet' | 'testnet' | 'signet' | 'regtest'

export type TransactionDecodeOptions = {
  /** When true, fetch transaction data from the indexer. Default false. */
  fetch?: boolean
  /** Network the txid belongs to. Default 'mainnet'. */
  network?: TransactionNetwork
  /** Indexer base URL override (self-host, esplora, blockstream).
   *  Defaults to the mempool.space URL for the chosen network. */
  endpoint?: string
  /** When true, fetch block extras to populate the miner pool name.
   *  Requires a mempool.space-compatible endpoint. Default false. */
  fetchMiner?: boolean
  /** Max time to wait per HTTP request, in ms. Default 5000. */
  timeout?: number
}

export type DecodeOptions = {
  nostr?: NostrDecodeOptions
  transaction?: TransactionDecodeOptions
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

export type ScriptPubKeyType =
  | 'p2pk'
  | 'p2pkh'
  | 'p2sh'
  | 'v0_p2wpkh'
  | 'v0_p2wsh'
  | 'v1_p2tr'
  | 'op_return'
  | 'multisig'
  | 'unknown'

export type TxPrevout = {
  /** Decoded address when the script is standard. Absent for OP_RETURN or non-standard scripts. */
  address?: string
  addressType?: BitcoinAddressType
  /** Amount in sats */
  value: number
  scriptPubKeyType: ScriptPubKeyType
}

export type TxInput = {
  /** Source transaction id. */
  txid: string
  /** Source output index. */
  vout: number
  /** Spent output. Absent for coinbase inputs. */
  prevout?: TxPrevout
  sequence: number
  witness?: string[]
  isCoinbase: boolean
}

export type TxOutput = {
  /** Decoded address when the script is standard. Absent for OP_RETURN or non-standard scripts. */
  address?: string
  addressType?: BitcoinAddressType
  /** Amount in sats */
  value: number
  scriptPubKeyType: ScriptPubKeyType
}

export type TxStatus = {
  confirmed: boolean
  blockHeight?: number
  blockHash?: string
  /** Block timestamp in unix seconds. */
  blockTime?: number
}

export type TxMiner = {
  name: string
  slug?: string
}

export type TransactionData = {
  /** Bitcoin network the transaction belongs to (from opts). */
  network: TransactionNetwork
  status: TxStatus
  /** Fee in sats. */
  fee: number
  /** Fee rate in sat/vB. */
  feeRate: number
  /** Sum of prevout values in sats. Zero for coinbase. */
  totalInput: number
  /** Sum of vout values in sats. */
  totalOutput: number
  size: number
  vsize: number
  weight: number
  version: number
  locktime: number
  inputs: TxInput[]
  outputs: TxOutput[]
  /** Present only when fetchMiner is true and the tx is confirmed. */
  miner?: TxMiner
}

export type DecodedTransaction = {
  valid: true
  kind: 'transaction'
  /** Raw text passed by the user */
  input: Input
  /** Transaction id (echo of input, lowercased). */
  txid: string
  /** Full transaction data. Present only when `opts.transaction.fetch === true`. */
  data?: TransactionData
}

export type DecodedData =
  | DecodedPayment
  | DecodedNostr
  | DecodedTransaction
  | DecodedError

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
