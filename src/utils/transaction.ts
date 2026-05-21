import { MEMPOOL_ENDPOINTS } from '../constants/mempool-endpoints'
import type {
  BitcoinAddressType,
  Input,
  ScriptPubKeyType,
  TransactionData,
  TransactionDecodeOptions,
  TransactionNetwork,
  TxInput,
  TxMiner,
  TxOutput,
  TxPrevout,
  TxStatus
} from '../types'
import { DecodeError } from '../types'

const TXID_REGEX = /^[0-9a-f]{64}$/i
const DEFAULT_TIMEOUT_MS = 5000

type EsploraScriptPubKeyType =
  | 'p2pk'
  | 'p2pkh'
  | 'p2sh'
  | 'v0_p2wpkh'
  | 'v0_p2wsh'
  | 'v1_p2tr'
  | 'op_return'
  | 'multisig'
  | 'unknown'
  | 'nonstandard'
  | 'nulldata'
  | (string & {})

type EsploraPrevout = {
  scriptpubkey?: string
  scriptpubkey_type?: EsploraScriptPubKeyType
  scriptpubkey_address?: string
  value: number
}

type EsploraVin = {
  txid: string
  vout: number
  prevout?: EsploraPrevout | null
  sequence: number
  witness?: string[]
  is_coinbase?: boolean
}

type EsploraVout = {
  scriptpubkey?: string
  scriptpubkey_type?: EsploraScriptPubKeyType
  scriptpubkey_address?: string
  value: number
}

type EsploraStatus = {
  confirmed: boolean
  block_height?: number
  block_hash?: string
  block_time?: number
}

type EsploraTx = {
  txid: string
  version: number
  locktime: number
  vin: EsploraVin[]
  vout: EsploraVout[]
  size: number
  weight: number
  fee: number
  status: EsploraStatus
}

type MempoolPool = {
  id?: number
  name?: string
  slug?: string
}

type MempoolBlock = {
  extras?: {
    pool?: MempoolPool
  }
}

function isTxId(input: Input): boolean {
  return TXID_REGEX.test(input)
}

const SCRIPT_TYPE_MAP: Record<string, ScriptPubKeyType> = {
  p2pk: 'p2pk',
  p2pkh: 'p2pkh',
  p2sh: 'p2sh',
  v0_p2wpkh: 'v0_p2wpkh',
  v0_p2wsh: 'v0_p2wsh',
  v1_p2tr: 'v1_p2tr',
  op_return: 'op_return',
  nulldata: 'op_return',
  multisig: 'multisig'
}

function normalizeScriptType(
  type: EsploraScriptPubKeyType | undefined
): ScriptPubKeyType {
  if (type === undefined) {
    return 'unknown'
  }
  return SCRIPT_TYPE_MAP[type] ?? 'unknown'
}

function scriptTypeToAddressType(
  type: ScriptPubKeyType
): BitcoinAddressType | undefined {
  switch (type) {
    case 'p2pkh':
      return 'p2pkh'
    case 'p2sh':
      return 'p2sh'
    case 'v0_p2wpkh':
      return 'p2wpkh'
    case 'v0_p2wsh':
      return 'p2wsh'
    case 'v1_p2tr':
      return 'p2tr'
    default:
      return undefined
  }
}

function mapPrevout(prevout: EsploraPrevout): TxPrevout {
  const scriptPubKeyType = normalizeScriptType(prevout.scriptpubkey_type)
  return {
    address: prevout.scriptpubkey_address,
    addressType: scriptTypeToAddressType(scriptPubKeyType),
    value: prevout.value,
    scriptPubKeyType
  }
}

function mapVin(vin: EsploraVin): TxInput {
  const isCoinbase = Boolean(vin.is_coinbase)
  return {
    txid: vin.txid,
    vout: vin.vout,
    prevout: vin.prevout ? mapPrevout(vin.prevout) : undefined,
    sequence: vin.sequence,
    witness: vin.witness,
    isCoinbase
  }
}

function mapVout(vout: EsploraVout): TxOutput {
  const scriptPubKeyType = normalizeScriptType(vout.scriptpubkey_type)
  return {
    address: vout.scriptpubkey_address,
    addressType: scriptTypeToAddressType(scriptPubKeyType),
    value: vout.value,
    scriptPubKeyType
  }
}

function mapStatus(status: EsploraStatus): TxStatus {
  return {
    confirmed: status.confirmed,
    blockHeight: status.block_height,
    blockHash: status.block_hash,
    blockTime: status.block_time
  }
}

function sumOutputs(outputs: { value: number }[]): number {
  let total = 0
  for (const output of outputs) {
    total += output.value
  }
  return total
}

function sumInputs(inputs: TxInput[]): number {
  let total = 0
  for (const input of inputs) {
    if (input.prevout) {
      total += input.prevout.value
    }
  }
  return total
}

function computeVsize(weight: number): number {
  return Math.ceil(weight / 4)
}

function computeFeeRate(fee: number, vsize: number): number {
  if (vsize <= 0) {
    return 0
  }
  return fee / vsize
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function resolveEndpoint(
  network: TransactionNetwork,
  override?: string
): string {
  if (override) {
    return stripTrailingSlash(override)
  }
  if (network === 'regtest') {
    throw new DecodeError(
      'Regtest has no default endpoint; pass opts.transaction.endpoint',
      'TX_FETCH_ERROR'
    )
  }
  return MEMPOOL_ENDPOINTS[network]
}

async function fetchJson<T>(url: string, timeout: number): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  let response: Response
  try {
    response = await fetch(url, { signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new DecodeError(
        `Transaction request timed out after ${timeout}ms`,
        'TX_TIMEOUT'
      )
    }
    const message =
      error instanceof Error ? error.message : 'Unknown network error'
    throw new DecodeError(
      `Transaction fetch failed: ${message}`,
      'TX_FETCH_ERROR'
    )
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 404) {
    throw new DecodeError('Transaction not found', 'TX_NOT_FOUND')
  }

  if (!response.ok) {
    throw new DecodeError(
      `Transaction fetch failed with status ${response.status}`,
      'TX_FETCH_ERROR'
    )
  }

  try {
    return (await response.json()) as T
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid JSON response'
    throw new DecodeError(
      `Transaction fetch returned invalid JSON: ${message}`,
      'TX_FETCH_ERROR'
    )
  }
}

async function fetchMinerPool(
  endpoint: string,
  blockHash: string,
  timeout: number
): Promise<TxMiner | undefined> {
  let block: MempoolBlock
  try {
    block = await fetchJson<MempoolBlock>(
      `${endpoint}/v1/block/${blockHash}`,
      timeout
    )
  } catch (error) {
    if (
      error instanceof DecodeError &&
      (error.code === 'TX_NOT_FOUND' || error.code === 'TX_FETCH_ERROR')
    ) {
      return undefined
    }
    throw error
  }

  const pool = block.extras?.pool
  if (!pool?.name) {
    return undefined
  }
  return { name: pool.name, slug: pool.slug }
}

async function fetchTransactionData(
  txid: string,
  opts: TransactionDecodeOptions
): Promise<TransactionData> {
  const network = opts.network ?? 'mainnet'
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT_MS
  const endpoint = resolveEndpoint(network, opts.endpoint)

  const tx = await fetchJson<EsploraTx>(`${endpoint}/tx/${txid}`, timeout)

  const inputs = tx.vin.map(mapVin)
  const outputs = tx.vout.map(mapVout)
  const vsize = computeVsize(tx.weight)
  const status = mapStatus(tx.status)

  let miner: TxMiner | undefined
  if (opts.fetchMiner && status.confirmed && status.blockHash) {
    miner = await fetchMinerPool(endpoint, status.blockHash, timeout)
  }

  return {
    network,
    status,
    fee: tx.fee,
    feeRate: computeFeeRate(tx.fee, vsize),
    totalInput: sumInputs(inputs),
    totalOutput: sumOutputs(tx.vout),
    size: tx.size,
    vsize,
    weight: tx.weight,
    version: tx.version,
    locktime: tx.locktime,
    inputs,
    outputs,
    miner
  }
}

export { fetchTransactionData, isTxId }
