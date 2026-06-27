import { describe, expect, it } from 'bun:test'
import {
  isBech32,
  normalizeDestinationValue,
  normalizeHex
} from '../src/utils/normalize'

describe('normalize', () => {
  it('detects bech32-encoded strings', () => {
    expect(isBech32('tb1qur637t05mfk6483kpxtvqufxdz54mg0et6hs8n')).toBe(true)
    expect(isBech32('lntbs10u1p5et0y3sp5cp3sp45t3hh84t08gcf49ye8')).toBe(true)
    expect(isBech32('2MsFGdp8z5FD49fDu8teN12xMgr9697A62w')).toBe(false)
    expect(isBech32('31h1vYVSYuKP6AhS86fbRdMw9XHieotbST')).toBe(false)
  })

  it('lowercases bech32 destination values', () => {
    expect(
      normalizeDestinationValue('TB1QUR637T05MFK6483KPXTVQUFXDZ54MG0ET6HS8N')
    ).toBe('tb1qur637t05mfk6483kpxtvqufxdz54mg0et6hs8n')
  })

  it('preserves base58 destination values', () => {
    const legacy = '31h1vYVSYuKP6AhS86fbRdMw9XHieotbST'
    expect(normalizeDestinationValue(legacy)).toBe(legacy)
  })

  it('lowercases hex values', () => {
    expect(
      normalizeHex(
        'ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789'
      )
    ).toBe('abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789')
  })
})
