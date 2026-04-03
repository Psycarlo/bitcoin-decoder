import {
  type BIP321ParseResult,
  type PaymentMethod,
  parseBIP321
} from 'bip-321'
import type { Input, Metadata, ParsedDestination } from '../types'
import { ark } from './ark'
import { bitcoin } from './bitcoin'
import { bolt11 } from './bolt11'
import { bolt12 } from './bolt12'
import { lightningAddress } from './lightning-address'

const SATS_PER_BTC = 100_000_000

type SupportedPaymentType = 'onchain' | 'lightning' | 'offer' | 'ark'

/** Priority order: Lightning (0) > Ark (1) > On-chain (2) */
const PROTOCOL_PRIORITY: Record<SupportedPaymentType, number> = {
  lightning: 0,
  offer: 0,
  ark: 1,
  onchain: 2
}

const SUPPORTED_TYPES = new Set<string>(Object.keys(PROTOCOL_PRIORITY))

function isSupportedType(type: string): type is SupportedPaymentType {
  return SUPPORTED_TYPES.has(type)
}

function getMetadata(result: BIP321ParseResult): Metadata | undefined {
  const amount = result.amount
    ? Math.round(result.amount * SATS_PER_BTC)
    : undefined
  const description = result.message ?? result.label

  if (amount === undefined && description === undefined) {
    return undefined
  }

  return { amount, description }
}

async function mapPaymentMethod(
  paymentMethod: PaymentMethod & { type: SupportedPaymentType },
  metadata?: Metadata
): Promise<ParsedDestination> {
  if (paymentMethod.type === 'lightning') {
    if (paymentMethod.value.includes('@')) {
      return await lightningAddress(paymentMethod.value)
    }
    return bolt11(paymentMethod.value)
  }

  if (paymentMethod.type === 'offer') {
    return bolt12(paymentMethod.value)
  }

  if (paymentMethod.type === 'ark') {
    return ark(paymentMethod.value)
  }

  const parsed = bitcoin(paymentMethod.value)
  return { ...parsed, metadata }
}

async function parse(result: BIP321ParseResult): Promise<ParsedDestination[]> {
  const metadata = getMetadata(result)

  return await Promise.all(
    result.paymentMethods
      .filter(
        (method): method is PaymentMethod & { type: SupportedPaymentType } =>
          (method.valid ||
            method.type === 'offer' ||
            (method.type === 'lightning' && method.value.includes('@'))) &&
          isSupportedType(method.type)
      )
      .sort((a, b) => PROTOCOL_PRIORITY[a.type] - PROTOCOL_PRIORITY[b.type])
      .map((method) => mapPaymentMethod(method, metadata))
  )
}

async function bip321(input: Input): Promise<ParsedDestination[]> {
  const result = parseBIP321(input)

  if (!result.valid) {
    throw new Error(`Invalid BIP-321 URI: ${result.errors.join(', ')}`)
  }

  return await parse(result)
}

export { bip321 }
