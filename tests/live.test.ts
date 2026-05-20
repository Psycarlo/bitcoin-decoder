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
})
