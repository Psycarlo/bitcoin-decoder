import { type DecodedInvoice, decode, type Section } from 'light-bolt11-decoder'
import type { ParsedDestination } from '../types'
import { normalizeDestinationValue } from './normalize'

function getSection<T extends Section['name']>(
  decodedInvoice: DecodedInvoice,
  name: T
): Extract<Section, { name: T }> | undefined {
  return decodedInvoice.sections.find(
    (section): section is Extract<Section, { name: T }> => section.name === name
  )
}

function parse(decodedInvoice: DecodedInvoice): ParsedDestination {
  const amount = getSection(decodedInvoice, 'amount')
  const description = getSection(decodedInvoice, 'description')

  return {
    destination: {
      value: normalizeDestinationValue(decodedInvoice.paymentRequest),
      protocol: 'lightning',
      type: 'bolt11'
    },
    metadata: {
      amount: amount ? Number(amount.value) / 1000 : undefined,
      description: description?.value
    }
  }
}

function bolt11(input: string) {
  return parse(decode(input))
}

export { bolt11 }
