import type { DecodedData, DecodeOptions, NostrEntity } from './types'
import { DecodeError } from './types'
import { ARK_PREFIXES, ark } from './utils/ark'
import { bip321 } from './utils/bip-321'
import { BITCOIN_ADDRESS_PREFIXES, bitcoin } from './utils/bitcoin'
import { bolt11 } from './utils/bolt11'
import { bolt12 } from './utils/bolt12'
import { extendedKey, isExtendedKey } from './utils/extended-key'
import { lightningAddress } from './utils/lightning-address'
import { LNURL_PREFIX, lnurl } from './utils/lnurl'
import { getNetwork } from './utils/network'
import { normalizeHex } from './utils/normalize'
import { NOSTR_PREFIXES, nostr } from './utils/nostr'
import { fetchProfile } from './utils/nostr-profile'
import { isPsbt, psbt } from './utils/psbt'
import { fetchTransactionData, isTxId } from './utils/transaction'

const BIP321_PREFIX = 'bitcoin:'
const LIGHTNING_PREFIX = 'lightning:'
const BOLT11_PREFIXES = ['lnbcrt', 'lntbs', 'lnbc', 'lntb']
const BOLT12_PREFIXES = ['lnbcrto1', 'lnto1', 'lno1']

type SuccessData = Extract<DecodedData, { valid: true; kind: 'payment' }>
type SuccessPayload = Omit<SuccessData, 'valid' | 'kind'>

function decodeBolt11(input: string, invoice: string): SuccessPayload {
  const parsedDestination = bolt11(invoice)
  const destination = parsedDestination.destination

  return {
    input,
    destination,
    destinations: [destination],
    network: getNetwork(invoice) || 'unknown',
    metadata: parsedDestination.metadata
  }
}

function decodeBolt12(input: string, offer: string): SuccessPayload {
  const parsedDestination = bolt12(offer)
  const destination = parsedDestination.destination

  return {
    input,
    destination,
    destinations: [destination],
    network: getNetwork(offer) || 'unknown',
    metadata: parsedDestination.metadata
  }
}

async function decodeLightningAddress(input: string): Promise<SuccessPayload> {
  const parsedDestination = await lightningAddress(input)
  const destination = parsedDestination.destination

  return {
    input,
    destination,
    destinations: [destination],
    network: 'unknown'
  }
}

async function decodeLnurl(input: string): Promise<SuccessPayload> {
  const parsedDestination = await lnurl(input)
  const destination = parsedDestination.destination

  return {
    input,
    destination,
    destinations: [destination],
    network: 'unknown'
  }
}

function decodeArk(input: string): SuccessPayload {
  const parsedDestination = ark(input)
  const destination = parsedDestination.destination

  return {
    input,
    destination,
    destinations: [destination],
    network: getNetwork(input) || 'unknown'
  }
}

async function decodeBip321(input: string): Promise<SuccessPayload> {
  const parsedDestinations = await bip321(input)

  const first = parsedDestinations[0]
  if (!first) {
    throw new DecodeError(
      `No supported payment methods in BIP-321 URI: ${input}`,
      'NO_PAYMENT_METHODS'
    )
  }

  const destination = first.destination
  const destinations = parsedDestinations.map((pd) => pd.destination)

  return {
    input,
    destination,
    destinations,
    network: getNetwork(destination.value) || 'unknown',
    metadata: first.metadata
  }
}

function decodeBitcoin(input: string): SuccessPayload {
  const parsedDestination = bitcoin(input)
  const destination = parsedDestination.destination

  return {
    input,
    destination,
    destinations: [destination],
    network: getNetwork(input) || 'unknown'
  }
}

async function decodeInput(input: string): Promise<SuccessPayload> {
  const lowerInput = input.toLowerCase()

  if (lowerInput.startsWith(BIP321_PREFIX)) {
    return decodeBip321(input)
  }

  if (lowerInput.startsWith(LIGHTNING_PREFIX)) {
    return decodeBolt11(input, input.slice(LIGHTNING_PREFIX.length))
  }

  if (BOLT11_PREFIXES.some((prefix) => lowerInput.startsWith(prefix))) {
    return decodeBolt11(input, input)
  }

  if (BOLT12_PREFIXES.some((prefix) => lowerInput.startsWith(prefix))) {
    return decodeBolt12(input, input)
  }

  if (lowerInput.startsWith(LNURL_PREFIX)) {
    return await decodeLnurl(input)
  }

  if (ARK_PREFIXES.some((prefix) => lowerInput.startsWith(prefix))) {
    return decodeArk(input)
  }

  if (input.includes('@')) {
    return await decodeLightningAddress(input)
  }

  if (
    BITCOIN_ADDRESS_PREFIXES.some((prefix) => lowerInput.startsWith(prefix))
  ) {
    return decodeBitcoin(input)
  }

  throw new DecodeError(`Unknown input format: ${input}`, 'UNKNOWN_FORMAT')
}

function getErrorCode(error: unknown): DecodedData & { valid: false } {
  if (error instanceof DecodeError) {
    return {
      valid: false,
      input: '',
      errorMessage: error.message,
      errorCode: error.code
    }
  }
  const message = error instanceof Error ? error.message : String(error)
  return {
    valid: false,
    input: '',
    errorMessage: message,
    errorCode: 'UNKNOWN_FORMAT'
  }
}

function isNostrInput(lowerInput: string): boolean {
  return NOSTR_PREFIXES.some((prefix) => lowerInput.startsWith(`${prefix}1`))
}

async function enrichWithProfile(
  entity: NostrEntity,
  opts: DecodeOptions
): Promise<NostrEntity> {
  const nostrOpts = opts.nostr
  if (!nostrOpts?.fetchProfile) {
    return entity
  }

  if (entity.type === 'npub') {
    const profile = await fetchProfile({
      pubkey: entity.data.hex,
      relays: nostrOpts.relays,
      timeout: nostrOpts.timeout,
      verify: nostrOpts.verify
    })
    return { type: 'npub', data: { ...entity.data, profile } }
  }

  if (entity.type === 'nprofile') {
    const relays = Array.from(
      new Set([...(nostrOpts.relays ?? []), ...entity.data.relays])
    )
    const profile = await fetchProfile({
      pubkey: entity.data.pubkey,
      relays: relays.length > 0 ? relays : undefined,
      timeout: nostrOpts.timeout,
      verify: nostrOpts.verify
    })
    return { type: 'nprofile', data: { ...entity.data, profile } }
  }

  return entity
}

/**
 * Decode any bitcoin-related string: on-chain addresses, Lightning invoices,
 * offers, LNURL, Lightning addresses, Ark addresses, BIP-321 URIs, Nostr
 * NIP-19 entities, extended keys, PSBTs, and transaction ids.
 *
 * The format is auto-detected from the input. This function never throws —
 * failures are returned as `{ valid: false, errorCode, errorMessage }`.
 *
 * Network lookups are opt-in: Nostr profile fetch (`opts.nostr.fetchProfile`)
 * and transaction lookup (`opts.transaction.fetch`). Everything else decodes
 * fully offline.
 *
 * @param input - The raw string to decode.
 * @param opts - Optional Nostr / transaction / PSBT decode options.
 * @returns A discriminated union. Narrow on `valid` first, then `kind`.
 *
 * @example
 * ```ts
 * import { decode } from 'bitcoin-decoder'
 *
 * const result = await decode('bc1q...')
 * if (!result.valid) {
 *   console.error(result.errorCode, result.errorMessage)
 * } else if (result.kind === 'payment') {
 *   console.log(result.destination.value, result.network)
 * }
 * ```
 *
 * @example
 * ```ts
 * // Opt in to a network lookup
 * const tx = await decode(txid, { transaction: { fetch: true } })
 * ```
 */
async function decode(
  input: string,
  opts: DecodeOptions = {}
): Promise<DecodedData> {
  try {
    const lowerInput = input.toLowerCase()
    if (isNostrInput(lowerInput)) {
      const entity = await enrichWithProfile(nostr(input), opts)
      return {
        valid: true,
        kind: 'nostr',
        input,
        encoded: lowerInput,
        entity
      }
    }
    if (isExtendedKey(input)) {
      return { valid: true, kind: 'key', input, key: extendedKey(input) }
    }
    if (isPsbt(input)) {
      return { valid: true, kind: 'psbt', input, data: psbt(input, opts.psbt) }
    }
    if (isTxId(input)) {
      const txid = normalizeHex(input)
      if (!opts.transaction?.fetch) {
        return { valid: true, kind: 'transaction', input, txid }
      }
      const data = await fetchTransactionData(txid, opts.transaction)
      return { valid: true, kind: 'transaction', input, txid, data }
    }
    return { valid: true, kind: 'payment', ...(await decodeInput(input)) }
  } catch (error) {
    return { ...getErrorCode(error), input }
  }
}

export { decode }
export { MEMPOOL_ENDPOINTS } from './constants/mempool-endpoints'
export type { NostrRelayUrl } from './constants/nostr-relays'
export { DEFAULT_NOSTR_RELAYS, NOSTR_RELAYS } from './constants/nostr-relays'
export type {
  DecodedData,
  DecodedKey,
  DecodedNostr,
  DecodedPayment,
  DecodedPsbt,
  DecodedTransaction,
  DecodeOptions,
  Destination,
  ExtendedKey,
  ExtendedKeyScriptType,
  ExtendedKeyType,
  Metadata,
  Network,
  NostrDecodeOptions,
  NostrEntity,
  NostrProfile,
  ParsedLNAddress,
  ProfileFetchResult,
  PsbtData,
  PsbtDecodeOptions,
  PsbtInput,
  PsbtOutput,
  ScriptPubKeyType,
  TransactionData,
  TransactionDecodeOptions,
  TransactionNetwork,
  TxInput,
  TxMiner,
  TxOutput,
  TxPrevout,
  TxStatus,
  WellKnown
} from './types'
export { wellKnown } from './utils/lightning-address'
