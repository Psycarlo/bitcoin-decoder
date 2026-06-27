import { base64, hex } from '@scure/base'
import type {
  Input,
  PsbtData,
  PsbtDecodeOptions,
  PsbtInput,
  PsbtOutput,
  TransactionNetwork
} from '../types'
import { DecodeError } from '../types'
import { decodeScriptPubKey } from './script'

const PSBT_MAGIC = [0x70, 0x73, 0x62, 0x74, 0xff]
const PSBT_MAGIC_HEX = '70736274ff'
const PSBT_MAGIC_B64 = 'cHNidP8'

// Global key types
const PSBT_GLOBAL_UNSIGNED_TX = 0x00
const PSBT_GLOBAL_TX_VERSION = 0x02
const PSBT_GLOBAL_FALLBACK_LOCKTIME = 0x03
const PSBT_GLOBAL_INPUT_COUNT = 0x04
const PSBT_GLOBAL_OUTPUT_COUNT = 0x05
const PSBT_GLOBAL_VERSION = 0xfb

// Input key types
const PSBT_IN_NON_WITNESS_UTXO = 0x00
const PSBT_IN_WITNESS_UTXO = 0x01
const PSBT_IN_PARTIAL_SIG = 0x02
const PSBT_IN_SIGHASH_TYPE = 0x03
const PSBT_IN_PREVIOUS_TXID = 0x0e
const PSBT_IN_OUTPUT_INDEX = 0x0f

// Output key types
const PSBT_OUT_AMOUNT = 0x03
const PSBT_OUT_SCRIPT = 0x04

class Reader {
  private offset = 0
  private readonly bytes: Uint8Array

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }

  get done(): boolean {
    return this.offset >= this.bytes.length
  }

  byte(): number {
    const value = this.bytes[this.offset]
    if (value === undefined) {
      throw new DecodeError('Unexpected end of PSBT', 'INVALID_PSBT')
    }
    this.offset += 1
    return value
  }

  slice(length: number): Uint8Array {
    if (this.offset + length > this.bytes.length) {
      throw new DecodeError('Unexpected end of PSBT', 'INVALID_PSBT')
    }
    const out = this.bytes.slice(this.offset, this.offset + length)
    this.offset += length
    return out
  }

  uint32(): number {
    const out = new DataView(this.slice(4).buffer).getUint32(0, true)
    return out
  }

  uint64(): number {
    const lo = this.uint32()
    const hi = this.uint32()
    return hi * 0x1_00_00_00_00 + lo
  }

  /** Bitcoin CompactSize / varint. */
  varint(): number {
    const first = this.byte()
    if (first < 0xfd) {
      return first
    }
    if (first === 0xfd) {
      return new DataView(this.slice(2).buffer).getUint16(0, true)
    }
    if (first === 0xfe) {
      return this.uint32()
    }
    return this.uint64()
  }
}

type KeyValueRecord = {
  keyType: number
  keyData: Uint8Array
  value: Uint8Array
}

/** Read one key-value map up to its 0x00 separator. */
function readMap(reader: Reader): KeyValueRecord[] {
  const records: KeyValueRecord[] = []
  while (!reader.done) {
    const keyLen = reader.varint()
    if (keyLen === 0) {
      return records
    }
    const keyType = reader.byte()
    const keyData = reader.slice(keyLen - 1)
    const valueLen = reader.varint()
    const value = reader.slice(valueLen)
    records.push({ keyType, keyData, value })
  }
  throw new DecodeError('PSBT map missing separator', 'INVALID_PSBT')
}

function find(
  records: KeyValueRecord[],
  keyType: number
): Uint8Array | undefined {
  return records.find((r) => r.keyType === keyType)?.value
}

function readUint32LE(bytes: Uint8Array): number {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  ).getUint32(0, true)
}

function toBytes(input: Input): Uint8Array {
  const trimmed = input.trim()
  try {
    if (trimmed.toLowerCase().startsWith(PSBT_MAGIC_HEX)) {
      return hex.decode(trimmed.toLowerCase())
    }
    return base64.decode(trimmed)
  } catch {
    throw new DecodeError('PSBT is not valid base64 or hex', 'INVALID_PSBT')
  }
}

function checkMagic(reader: Reader): void {
  for (const expected of PSBT_MAGIC) {
    if (reader.byte() !== expected) {
      throw new DecodeError('Invalid PSBT magic bytes', 'INVALID_PSBT')
    }
  }
}

type UnsignedTx = {
  version: number
  locktime: number
  inputs: { txid: string; vout: number }[]
  outputs: { value: number; script: Uint8Array }[]
}

/** Parse a legacy (non-witness) serialized transaction. */
function parseUnsignedTx(bytes: Uint8Array): UnsignedTx {
  const reader = new Reader(bytes)
  const version = reader.uint32()
  const inputCount = reader.varint()
  const inputs: UnsignedTx['inputs'] = []
  for (let i = 0; i < inputCount; i += 1) {
    const txid = hex.encode(reader.slice(32).reverse())
    const vout = reader.uint32()
    const scriptLen = reader.varint()
    reader.slice(scriptLen)
    reader.uint32() // sequence
    inputs.push({ txid, vout })
  }
  const outputCount = reader.varint()
  const outputs: UnsignedTx['outputs'] = []
  for (let i = 0; i < outputCount; i += 1) {
    const value = reader.uint64()
    const scriptLen = reader.varint()
    const script = reader.slice(scriptLen)
    outputs.push({ value, script })
  }
  const locktime = reader.uint32()
  return { version, locktime, inputs, outputs }
}

/** Parse the value of a specific output from a full (maybe segwit) tx. */
function outputValueAt(txBytes: Uint8Array, vout: number): number | undefined {
  const reader = new Reader(txBytes)
  reader.uint32() // version
  let inputCount = reader.varint()
  // segwit marker + flag
  if (inputCount === 0) {
    reader.byte() // flag
    inputCount = reader.varint()
  }
  for (let i = 0; i < inputCount; i += 1) {
    reader.slice(36) // outpoint
    const scriptLen = reader.varint()
    reader.slice(scriptLen)
    reader.uint32() // sequence
  }
  const outputCount = reader.varint()
  for (let i = 0; i < outputCount; i += 1) {
    const value = reader.uint64()
    const scriptLen = reader.varint()
    reader.slice(scriptLen)
    if (i === vout) {
      return value
    }
  }
  return undefined
}

function buildOutput(
  value: number,
  script: Uint8Array,
  network: TransactionNetwork
): PsbtOutput {
  const decoded = decodeScriptPubKey(script, network)
  return {
    value,
    address: decoded.address,
    addressType: decoded.addressType,
    scriptPubKeyType: decoded.scriptPubKeyType
  }
}

function buildInput(
  records: KeyValueRecord[],
  txid: string,
  vout: number,
  network: TransactionNetwork
): PsbtInput {
  const input: PsbtInput = {
    txid,
    vout,
    partialSigs: records.filter((r) => r.keyType === PSBT_IN_PARTIAL_SIG)
      .length,
    witnessUtxo: false,
    nonWitnessUtxo: false
  }

  const sighash = find(records, PSBT_IN_SIGHASH_TYPE)
  if (sighash && sighash.length >= 4) {
    input.sighashType = readUint32LE(sighash)
  }

  const witnessUtxo = find(records, PSBT_IN_WITNESS_UTXO)
  if (witnessUtxo) {
    input.witnessUtxo = true
    const reader = new Reader(witnessUtxo)
    input.value = reader.uint64()
    const script = reader.slice(reader.varint())
    const decoded = decodeScriptPubKey(script, network)
    input.address = decoded.address
    input.addressType = decoded.addressType
    input.scriptPubKeyType = decoded.scriptPubKeyType
    return input
  }

  const nonWitnessUtxo = find(records, PSBT_IN_NON_WITNESS_UTXO)
  if (nonWitnessUtxo) {
    input.nonWitnessUtxo = true
    input.value = outputValueAt(nonWitnessUtxo, vout)
  }

  return input
}

function decodeV0(
  global: KeyValueRecord[],
  reader: Reader,
  network: TransactionNetwork
): PsbtData {
  const rawTx = find(global, PSBT_GLOBAL_UNSIGNED_TX)
  if (!rawTx) {
    throw new DecodeError(
      'PSBT v0 missing unsigned transaction',
      'INVALID_PSBT'
    )
  }
  const tx = parseUnsignedTx(rawTx)

  const inputs: PsbtInput[] = []
  for (const txin of tx.inputs) {
    const records = readMap(reader)
    inputs.push(buildInput(records, txin.txid, txin.vout, network))
  }

  const outputs: PsbtOutput[] = []
  for (const txout of tx.outputs) {
    readMap(reader) // output map (redeem/witness scripts ignored)
    outputs.push(buildOutput(txout.value, txout.script, network))
  }

  return assemble(0, tx.version, tx.locktime, inputs, outputs)
}

function decodeV2(
  global: KeyValueRecord[],
  reader: Reader,
  network: TransactionNetwork
): PsbtData {
  const txVersion = find(global, PSBT_GLOBAL_TX_VERSION)
  const inputCountRaw = find(global, PSBT_GLOBAL_INPUT_COUNT)
  const outputCountRaw = find(global, PSBT_GLOBAL_OUTPUT_COUNT)
  const locktimeRaw = find(global, PSBT_GLOBAL_FALLBACK_LOCKTIME)

  const inputCount = inputCountRaw ? new Reader(inputCountRaw).varint() : 0
  const outputCount = outputCountRaw ? new Reader(outputCountRaw).varint() : 0

  const inputs: PsbtInput[] = []
  for (let i = 0; i < inputCount; i += 1) {
    const records = readMap(reader)
    const txidBytes = find(records, PSBT_IN_PREVIOUS_TXID)
    const voutBytes = find(records, PSBT_IN_OUTPUT_INDEX)
    const txid = txidBytes ? hex.encode(txidBytes.slice().reverse()) : ''
    const vout = voutBytes ? readUint32LE(voutBytes) : 0
    inputs.push(buildInput(records, txid, vout, network))
  }

  const outputs: PsbtOutput[] = []
  for (let i = 0; i < outputCount; i += 1) {
    const records = readMap(reader)
    const amount = find(records, PSBT_OUT_AMOUNT)
    const script = find(records, PSBT_OUT_SCRIPT)
    const value = amount ? new Reader(amount).uint64() : 0
    outputs.push(buildOutput(value, script ?? new Uint8Array(), network))
  }

  return assemble(
    2,
    txVersion ? readUint32LE(txVersion) : 0,
    locktimeRaw ? readUint32LE(locktimeRaw) : 0,
    inputs,
    outputs
  )
}

function assemble(
  version: number,
  txVersion: number,
  locktime: number,
  inputs: PsbtInput[],
  outputs: PsbtOutput[]
): PsbtData {
  let totalOutput = 0
  for (const output of outputs) {
    totalOutput += output.value
  }

  const allInputsKnown =
    inputs.length > 0 && inputs.every((i) => i.value !== undefined)
  let totalInput: number | undefined
  let fee: number | undefined
  if (allInputsKnown) {
    totalInput = inputs.reduce((sum, i) => sum + (i.value ?? 0), 0)
    fee = totalInput - totalOutput
  }

  return {
    version,
    txVersion,
    locktime,
    inputCount: inputs.length,
    outputCount: outputs.length,
    inputs,
    outputs,
    totalOutput,
    totalInput,
    fee
  }
}

function isPsbt(input: Input): boolean {
  const trimmed = input.trim()
  return (
    trimmed.toLowerCase().startsWith(PSBT_MAGIC_HEX) ||
    trimmed.startsWith(PSBT_MAGIC_B64)
  )
}

function psbt(input: Input, opts: PsbtDecodeOptions = {}): PsbtData {
  const network = opts.network ?? 'mainnet'
  const reader = new Reader(toBytes(input))
  checkMagic(reader)

  const global = readMap(reader)
  const versionBytes = find(global, PSBT_GLOBAL_VERSION)
  const psbtVersion = versionBytes ? readUint32LE(versionBytes) : 0

  return psbtVersion >= 2
    ? decodeV2(global, reader, network)
    : decodeV0(global, reader, network)
}

export { psbt, isPsbt }
