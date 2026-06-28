import type { NostrRelayUrl } from '../constants/nostr-relays'

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
      /** The decoded destination string (address, invoice, offer, etc.) */
      value: string
      type: 'bitcoin-address'
      protocol: Protocol
      addressType: BitcoinAddressType
    }
  | {
      /** The decoded destination string (address, invoice, offer, etc.) */
      value: string
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
  | 'INVALID_EXTENDED_KEY'
  | 'INVALID_PSBT'

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
  psbt?: PsbtDecodeOptions
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
  input: string
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
  input: string
  errorMessage: string
  errorCode: ErrorCode
}

export type DecodedNostr = {
  valid: true
  kind: 'nostr'
  /** Raw text passed by the user */
  input: string
  /** Lowercase NIP-19 bech32 encoding */
  encoded: string
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
  input: string
  /** Transaction id (echo of input, lowercased). */
  txid: string
  /** Full transaction data. Present only when `opts.transaction.fetch === true`. */
  data?: TransactionData
}

/** SLIP-132 / BIP-32 extended key serialization prefixes. */
export type ExtendedKeyType =
  | 'xpub'
  | 'xprv'
  | 'ypub'
  | 'yprv'
  | 'zpub'
  | 'zprv'
  | 'Ypub'
  | 'Yprv'
  | 'Zpub'
  | 'Zprv'
  | 'tpub'
  | 'tprv'
  | 'upub'
  | 'uprv'
  | 'vpub'
  | 'vprv'
  | 'Upub'
  | 'Uprv'
  | 'Vpub'
  | 'Vprv'

/** Script type implied by the SLIP-132 prefix (single-sig vs. multisig). */
export type ExtendedKeyScriptType =
  | 'p2pkh'
  | 'p2wpkh-p2sh'
  | 'p2wpkh'
  | 'p2wsh-p2sh'
  | 'p2wsh'

export type ExtendedKey = {
  type: ExtendedKeyType
  /** True for `*prv` keys, false for `*pub` keys. */
  isPrivate: boolean
  network: Network
  scriptType: ExtendedKeyScriptType
  /** Derivation depth (0 for a master key). */
  depth: number
  /** Parent key fingerprint, 8 hex chars (`00000000` for a master key). */
  parentFingerprint: string
  /** Raw child number including the hardened bit. */
  childNumber: number
  /** Child index with the hardened bit masked off. */
  index: number
  hardened: boolean
  /** Chain code, 64 hex chars. */
  chainCode: string
  /** 33-byte key payload as hex (compressed pubkey, or `00` + 32-byte privkey). */
  key: string
  /** Key fingerprint `hash160(pubkey)[:4]`. Present only for public keys. */
  fingerprint?: string
}

export type DecodedKey = {
  valid: true
  kind: 'key'
  /** Raw text passed by the user */
  input: string
  key: ExtendedKey
}

export type PsbtDecodeOptions = {
  /** Network used to encode output/input addresses. Default 'mainnet'. */
  network?: TransactionNetwork
}

export type PsbtInput = {
  /** Outpoint being spent. */
  txid: string
  vout: number
  /** Value of the spent output in sats, when a (non-)witness UTXO is present. */
  value?: number
  address?: string
  addressType?: BitcoinAddressType
  scriptPubKeyType?: ScriptPubKeyType
  /** Number of partial signatures attached to this input. */
  partialSigs: number
  sighashType?: number
  witnessUtxo: boolean
  nonWitnessUtxo: boolean
}

export type PsbtOutput = {
  /** Amount in sats */
  value: number
  address?: string
  addressType?: BitcoinAddressType
  scriptPubKeyType: ScriptPubKeyType
}

export type PsbtData = {
  /** PSBT version: 0 (BIP-174) or 2 (BIP-370). */
  version: number
  /** Underlying transaction version. */
  txVersion: number
  locktime: number
  inputCount: number
  outputCount: number
  inputs: PsbtInput[]
  outputs: PsbtOutput[]
  /** Sum of output values in sats. */
  totalOutput: number
  /** Sum of known input values in sats. Present only when every input exposes its UTXO. */
  totalInput?: number
  /** Fee in sats (`totalInput - totalOutput`). Present only when `totalInput` is known. */
  fee?: number
}

export type DecodedPsbt = {
  valid: true
  kind: 'psbt'
  /** Raw text passed by the user */
  input: string
  data: PsbtData
}

export type DecodedData =
  | DecodedPayment
  | DecodedNostr
  | DecodedTransaction
  | DecodedKey
  | DecodedPsbt
  | DecodedError

export class DecodeError extends Error {
  code: ErrorCode

  constructor(message: string, code: ErrorCode) {
    super(message)
    this.code = code
  }
}

export type ParsedDestination = {
  destination: Destination
  metadata?: Metadata
}
