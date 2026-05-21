// @ts-nocheck
import { describe, expect, it } from 'bun:test'
import { decode } from '../src'

describe('Live integration', () => {
  describe('Nostr profile fetch', () => {
    it('fetches a real profile from public relays', async () => {
      const npub =
        'npub1yxvrqs607p97k4gv8pmwveyhfrsewpd7de9wyuxtt4n0hr3zducsg8dhkz'
      const result = await decode(npub, {
        nostr: { fetchProfile: true, timeout: 8000 }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'nostr') {
        return
      }
      if (result.entity.type !== 'npub') {
        return
      }
      const profile = result.entity.data.profile
      expect(profile?.status).toBe('ok')
      if (profile?.status === 'ok') {
        expect(profile.data.name || profile.data.displayName).toBeTruthy()
      }
    }, 15_000)
  })

  describe('Transaction decode', () => {
    it('decodes a mainnet transaction (Hal Finney, block 181)', async () => {
      const txid =
        'a16f3ce4dd5deb92d98ef5cf8afeaf0775ebca408f708b2146c4fb42b41e14be'
      const result = await decode(txid, {
        transaction: { fetch: true, timeout: 10_000 }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      expect(result.txid).toBe(txid)
      expect(result.data).toBeDefined()
      const data = result.data
      if (!data) {
        return
      }
      expect(data.network).toBe('mainnet')
      expect(data.status.confirmed).toBe(true)
      expect(data.status.blockHeight).toBe(181)
      expect(data.status.blockHash).toBeTruthy()
      expect(data.status.blockTime).toBeGreaterThan(0)
      expect(data.fee).toBe(0)
      expect(data.feeRate).toBe(0)
      expect(data.inputs).toHaveLength(1)
      expect(data.inputs[0].isCoinbase).toBe(false)
      expect(data.inputs[0].prevout?.value).toBe(4_000_000_000)
      expect(data.outputs).toHaveLength(2)
      expect(data.outputs[0].scriptPubKeyType).toBe('p2pk')
      expect(data.outputs[0].value).toBe(1_000_000_000)
      expect(data.outputs[1].value).toBe(3_000_000_000)
      expect(data.totalInput).toBe(4_000_000_000)
      expect(data.totalOutput).toBe(4_000_000_000)
      expect(data.size).toBeGreaterThan(0)
      expect(data.weight).toBeGreaterThan(0)
      expect(data.vsize).toBe(Math.ceil(data.weight / 4))
      expect(data.miner).toBeUndefined()
    }, 15_000)

    it('decodes a coinbase tx with isCoinbase=true and no prevout', async () => {
      const txid =
        '8c14f0db3df150123e6f3dbbf30f8b955a8249b62ac1d1ff16284aefa3d06d87'
      const result = await decode(txid, {
        transaction: { fetch: true, timeout: 10_000 }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      const data = result.data
      if (!data) {
        return
      }
      expect(data.status.confirmed).toBe(true)
      expect(data.status.blockHeight).toBe(100_000)
      expect(data.inputs).toHaveLength(1)
      expect(data.inputs[0].isCoinbase).toBe(true)
      expect(data.inputs[0].prevout).toBeUndefined()
      expect(data.totalInput).toBe(0)
      expect(data.outputs[0].value).toBe(5_000_000_000)
      expect(data.outputs[0].scriptPubKeyType).toBe('p2pk')
      expect(data.fee).toBe(0)
    }, 15_000)

    it('decodes a signet tx', async () => {
      const txid =
        '945cfba947b6cb1ff1a4583291bf8cb1f282dae643f75d97ac39c61d87aa794c'
      const result = await decode(txid, {
        transaction: { fetch: true, network: 'signet', timeout: 10_000 }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      const data = result.data
      if (!data) {
        return
      }
      expect(data.network).toBe('signet')
      expect(data.status.confirmed).toBe(true)
      expect(data.status.blockHeight).toBe(305_403)
      expect(data.fee).toBe(33_950)
      expect(data.totalOutput).toBe(12_466_050)
      expect(data.feeRate).toBeGreaterThan(0)
    }, 15_000)

    it('decodes a testnet4 tx via network: "testnet"', async () => {
      const txid =
        '13a5677a11e1dfc731c8b8f5290ac2aa656e58a0d386366e50d2f2be013fc9a3'
      const result = await decode(txid, {
        transaction: { fetch: true, network: 'testnet', timeout: 10_000 }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      const data = result.data
      if (!data) {
        return
      }
      expect(data.network).toBe('testnet')
      expect(data.status.confirmed).toBe(true)
      expect(data.status.blockHeight).toBe(135_872)
      expect(data.fee).toBe(830)
      expect(data.totalOutput).toBe(2170)
    }, 15_000)

    it('fetches miner pool name when fetchMiner=true', async () => {
      const txid =
        '8c14f0db3df150123e6f3dbbf30f8b955a8249b62ac1d1ff16284aefa3d06d87'
      const result = await decode(txid, {
        transaction: { fetch: true, fetchMiner: true, timeout: 10_000 }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      const data = result.data
      if (!data) {
        return
      }
      expect(data.miner).toBeDefined()
      expect(typeof data.miner?.name).toBe('string')
      expect(data.miner?.name.length).toBeGreaterThan(0)
    }, 15_000)

    it('returns TX_NOT_FOUND for a non-existent txid', async () => {
      const fake =
        '0000000000000000000000000000000000000000000000000000000000000001'
      const result = await decode(fake, {
        transaction: { fetch: true, timeout: 10_000 }
      })

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.errorCode).toBe('TX_NOT_FOUND')
    }, 15_000)

    it('decodes via blockstream.info esplora endpoint override', async () => {
      const txid =
        'a16f3ce4dd5deb92d98ef5cf8afeaf0775ebca408f708b2146c4fb42b41e14be'
      const result = await decode(txid, {
        transaction: {
          fetch: true,
          endpoint: 'https://blockstream.info/api',
          timeout: 10_000
        }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      const data = result.data
      if (!data) {
        return
      }
      expect(data.status.confirmed).toBe(true)
      expect(data.status.blockHeight).toBe(181)
      expect(data.fee).toBe(0)
      expect(data.totalOutput).toBe(4_000_000_000)
      expect(data.totalInput).toBe(4_000_000_000)
      expect(data.outputs).toHaveLength(2)
      expect(data.outputs[0].scriptPubKeyType).toBe('p2pk')
      expect(data.miner).toBeUndefined()
    }, 15_000)

    it('decodes signet tx via blockstream.info esplora endpoint override', async () => {
      const txid =
        '945cfba947b6cb1ff1a4583291bf8cb1f282dae643f75d97ac39c61d87aa794c'
      const result = await decode(txid, {
        transaction: {
          fetch: true,
          network: 'signet',
          endpoint: 'https://blockstream.info/signet/api',
          timeout: 10_000
        }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      const data = result.data
      if (!data) {
        return
      }
      expect(data.network).toBe('signet')
      expect(data.status.confirmed).toBe(true)
      expect(data.status.blockHeight).toBe(305_403)
      expect(data.fee).toBe(33_950)
      expect(data.totalOutput).toBe(12_466_050)
      expect(data.miner).toBeUndefined()
    }, 15_000)

    it('returns undefined miner when fetchMiner=true against blockstream (no extras)', async () => {
      const txid =
        'a16f3ce4dd5deb92d98ef5cf8afeaf0775ebca408f708b2146c4fb42b41e14be'
      const result = await decode(txid, {
        transaction: {
          fetch: true,
          fetchMiner: true,
          endpoint: 'https://blockstream.info/api',
          timeout: 10_000
        }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      expect(result.data?.miner).toBeUndefined()
    }, 15_000)
  })
})
