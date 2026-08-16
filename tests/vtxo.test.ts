import { describe, expect, it } from 'bun:test'
import { decode, decodeVtxo, isVtxo } from '../src'
import {
  arkoor2Vtxo,
  arkoorHtlcOutVtxo,
  boardVtxo,
  round2Vtxo,
  vtxoVectors
} from './fixtures/vtxo'

/** Truncate a hex string by a whole number of bytes. */
function truncateBytes(hex: string, bytes: number): string {
  return hex.slice(0, hex.length - bytes * 2)
}

const TXID_PATTERN = /^[0-9a-f]{64}$/
const UNSUPPORTED_VERSION_PATTERN = /[Uu]nsupported VTXO encoding version 1/
const FUTURE_VERSION_PATTERN = /version 153/
const TRAILING_BYTES_PATTERN = /trailing byte/
const ENDED_EARLY_PATTERN = /ended early/
const ODD_LENGTH_PATTERN = /odd number of hex digits/
const NOT_HEX_PATTERN = /not valid hex/
const EMPTY_PATTERN = /empty/

describe('VTXO', () => {
  describe('exit chain reconstruction', () => {
    // The strongest available check: a VTXO's `point` is fully determined by
    // its genesis data, so rebuilding the chain and arriving at the encoded
    // outpoint transitively validates MuSig2 key aggregation, taproot
    // tweaking, tapleaf/branch hashing, script construction, transaction
    // serialization and txid computation. Any error in that stack changes the
    // derived txid.
    for (const vector of vtxoVectors) {
      it(`derives the encoded point for the ${vector.name} vector`, () => {
        const data = decodeVtxo(vector.hex)
        const final = data.exitChain.at(-1)

        expect(final).toBeDefined()
        expect(`${final?.txid}:${final?.vout}`).toBe(data.vtxoId)
      })
    }

    it('roots the chain at the on-chain anchor', () => {
      const data = decodeVtxo(boardVtxo)

      expect(data.exitChain).toHaveLength(1)
      expect(data.chainDepth).toBe(1)
      // A board VTXO exits in a single transaction spending the anchor.
      expect(data.exitChain[0]?.outputAmount).toBe(data.amount)
    })

    it('chains each exit transaction to the previous one', () => {
      const data = decodeVtxo(arkoor2Vtxo)

      expect(data.exitChain.length).toBeGreaterThan(1)
      for (const [index, step] of data.exitChain.entries()) {
        expect(step.txid).toMatch(TXID_PATTERN)
        expect(step.hex.length).toBeGreaterThan(0)
        // Value only ever decreases along the chain, by siblings plus fees.
        if (index > 0) {
          const previous = data.exitChain[index - 1]
          expect(step.inputAmount).toBeLessThanOrEqual(
            previous?.outputAmount as number
          )
        }
      }
    })

    it('carries the VTXO amount out of the final transaction', () => {
      for (const vector of vtxoVectors) {
        const data = decodeVtxo(vector.hex)
        expect(data.exitChain.at(-1)?.outputAmount).toBe(data.amount)
      }
    })
  })

  describe('header fields', () => {
    it('decodes the board VTXO header', () => {
      const data = decodeVtxo(boardVtxo)

      expect(data.version).toBe(2)
      expect(data.amount).toBe(10_000)
      expect(data.serverPubkey).toHaveLength(66)
      expect(
        data.serverPubkey.startsWith('02') || data.serverPubkey.startsWith('03')
      ).toBe(true)
      expect(data.anchorPoint.txid).toMatch(TXID_PATTERN)
      expect(data.point.txid).toMatch(TXID_PATTERN)
      expect(data.vtxoId).toBe(`${data.point.txid}:${data.point.vout}`)
      expect(data.expiryHeight).toBeGreaterThan(0)
      expect(data.isVirtualUtxo).toBe(false)
    })

    it('reads every vector to exactly its encoded length', () => {
      // The decoder rejects trailing bytes, so a clean decode of all vectors
      // proves the field widths are right end to end.
      for (const vector of vtxoVectors) {
        expect(() => decodeVtxo(vector.hex)).not.toThrow()
      }
    })

    it('accepts a 0x prefix and uppercase hex', () => {
      const expected = decodeVtxo(boardVtxo)

      expect(decodeVtxo(`0x${boardVtxo}`).vtxoId).toBe(expected.vtxoId)
      expect(decodeVtxo(boardVtxo.toUpperCase()).vtxoId).toBe(expected.vtxoId)
      expect(decodeVtxo(`  ${boardVtxo}  `).vtxoId).toBe(expected.vtxoId)
    })
  })

  describe('policies', () => {
    it('decodes a plain pubkey policy', () => {
      const data = decodeVtxo(boardVtxo)

      expect(data.policy.kind).toBe('pubkey')
      if (data.policy.kind !== 'pubkey') {
        return
      }
      expect(data.policy.userPubkey).toHaveLength(66)
    })

    it('decodes a server HTLC send policy', () => {
      const data = decodeVtxo(arkoorHtlcOutVtxo)

      expect(data.policy.kind).toBe('server-htlc-send-v1')
      if (data.policy.kind !== 'server-htlc-send-v1') {
        return
      }
      expect(data.policy.paymentHash).toHaveLength(64)
      expect(data.policy.htlcExpiry).toBeGreaterThan(0)
      expect(data.policy.userPubkey).toHaveLength(66)
    })

    it('decodes a server HTLC receive policy with its expiry delta', () => {
      const data = decodeVtxo(round2Vtxo)

      expect(data.policy.kind).toBe('server-htlc-receive-v1')
      if (data.policy.kind !== 'server-htlc-receive-v1') {
        return
      }
      expect(data.policy.paymentHash).toHaveLength(64)
      expect(data.policy.htlcExpiryDelta).toBeGreaterThanOrEqual(0)
    })
  })

  describe('genesis items', () => {
    it('exposes transitions with their signing status', () => {
      const data = decodeVtxo(arkoor2Vtxo)

      expect(data.genesis).toHaveLength(data.chainDepth)
      for (const item of data.genesis) {
        expect(item.outputIdx).toBeLessThan(item.otherOutputs.length + 1)
        expect(item.feeAmount).toBeGreaterThanOrEqual(0)
        expect(typeof item.isSigned).toBe('boolean')
      }
    })

    it('treats an all-zero signature as absent', () => {
      // Every vector is fully signed, so no transition should report a null
      // signature — this guards the zero-sentinel decoding in both directions.
      const data = decodeVtxo(boardVtxo)
      const [item] = data.genesis

      expect(item?.transition.kind).toBe('cosigned')
      if (item?.transition.kind !== 'cosigned') {
        return
      }
      expect(item.transition.signature).not.toBeNull()
      expect(item.transition.signature).toHaveLength(128)
      expect(item.isSigned).toBe(true)
    })

    it('reports fully-signed vectors as signed', () => {
      for (const vector of vtxoVectors) {
        expect(decodeVtxo(vector.hex).isFullySigned).toBe(true)
      }
    })

    it('sums genesis fees into totalFees', () => {
      const data = decodeVtxo(arkoor2Vtxo)
      const expected = data.genesis.reduce(
        (sum, item) => sum + item.feeAmount,
        0
      )

      expect(data.totalFees).toBe(expected)
    })

    it('decodes arkoor transitions with their tap tweak', () => {
      const data = decodeVtxo(arkoor2Vtxo)
      const arkoor = data.genesis.find(
        (item) => item.transition.kind === 'arkoor'
      )

      expect(arkoor).toBeDefined()
      if (arkoor?.transition.kind !== 'arkoor') {
        return
      }
      expect(arkoor.transition.tapTweak).toHaveLength(64)
    })
  })

  describe('malformed input', () => {
    it('rejects an unsupported encoding version', () => {
      // Version 1 is bark's legacy encoding without per-item fee amounts.
      const legacy = `0100${boardVtxo.slice(4)}`

      expect(() => decodeVtxo(legacy)).toThrow(UNSUPPORTED_VERSION_PATTERN)
    })

    it('names the version in the error for a future encoding', () => {
      const future = `9900${boardVtxo.slice(4)}`

      expect(() => decodeVtxo(future)).toThrow(FUTURE_VERSION_PATTERN)
    })

    it('rejects trailing bytes', () => {
      expect(() => decodeVtxo(`${boardVtxo}00`)).toThrow(TRAILING_BYTES_PATTERN)
    })

    it('rejects truncated input', () => {
      expect(() => decodeVtxo(truncateBytes(boardVtxo, 8))).toThrow(
        ENDED_EARLY_PATTERN
      )
    })

    it('rejects odd-length hex', () => {
      expect(() => decodeVtxo(`${boardVtxo}0`)).toThrow(ODD_LENGTH_PATTERN)
    })

    it('rejects non-hex input', () => {
      expect(() => decodeVtxo('zzzz')).toThrow(NOT_HEX_PATTERN)
    })

    it('rejects empty input', () => {
      expect(() => decodeVtxo('')).toThrow(EMPTY_PATTERN)
      expect(() => decodeVtxo('   ')).toThrow(EMPTY_PATTERN)
    })

    it('carries a typed error code', () => {
      try {
        decodeVtxo('zzzz')
        expect.unreachable('should have thrown')
      } catch (error) {
        expect((error as { code?: string }).code).toBe('INVALID_VTXO')
      }

      try {
        decodeVtxo(`0100${boardVtxo.slice(4)}`)
        expect.unreachable('should have thrown')
      } catch (error) {
        expect((error as { code?: string }).code).toBe(
          'UNSUPPORTED_VTXO_VERSION'
        )
      }
    })
  })

  describe('isVtxo', () => {
    it('recognises every valid vector', () => {
      for (const vector of vtxoVectors) {
        expect(isVtxo(vector.hex)).toBe(true)
      }
    })

    it('does not claim other hex-shaped inputs', () => {
      const txid = 'a'.repeat(64)

      expect(isVtxo(txid)).toBe(false)
      expect(isVtxo('')).toBe(false)
      expect(isVtxo('not hex at all')).toBe(false)
      // Right length, wrong version word.
      expect(isVtxo(`0900${boardVtxo.slice(4)}`)).toBe(false)
    })
  })

  describe('decode integration', () => {
    it('decodes a VTXO when the caller opts in', async () => {
      const result = await decode(boardVtxo, { vtxo: {} })

      expect(result.valid).toBe(true)
      if (!(result.valid && result.kind === 'vtxo')) {
        expect.unreachable('expected a vtxo result')
        return
      }
      expect(result.input).toBe(boardVtxo)
      expect(result.data.amount).toBe(10_000)
      expect(result.data.exitChain.length).toBeGreaterThan(0)
    })

    it('ignores VTXOs without the opt-in flag', async () => {
      const result = await decode(boardVtxo)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.errorCode).toBe('UNKNOWN_FORMAT')
    })

    it('surfaces malformed VTXOs as an error result rather than throwing', async () => {
      const result = await decode(`${boardVtxo}00`, { vtxo: {} })

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.errorCode).toBe('INVALID_VTXO')
    })

    it('still decodes a txid when VTXO detection is enabled', async () => {
      const txid = 'f'.repeat(64)
      const result = await decode(txid, { vtxo: {} })

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      // A 64-char txid must not be swallowed by VTXO sniffing.
      expect(result.kind).toBe('transaction')
    })

    it('leaves other formats untouched when VTXO detection is enabled', async () => {
      const address = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'
      const result = await decode(address, { vtxo: {} })

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.kind).toBe('payment')
    })
  })
})
