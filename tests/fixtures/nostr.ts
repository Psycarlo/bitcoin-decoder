/**
 * NIP-19 test vectors.
 * Sources:
 *  - npub: jb55's well-known public key
 *  - nprofile: verbatim example from the NIP-19 specification
 *  - nsec, note, nevent, naddr: synthesised locally for this test suite
 */
export const nostrEntities = {
  npub: {
    valid: 'npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s',
    pubkeyHex:
      '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245'
  },
  nsec: {
    valid: 'nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5',
    privkeyHex:
      '67dea2ed018072d675f5415ecfaed7d2597555e202d85b3d65ea4e58d2d92ffa'
  },
  note: {
    valid: 'note15hp58hrhzs33h6dndppynaeatnjuhagxsww6css6m8pwtdrzl2ps7u68we',
    eventIdHex:
      'a5c343dc7714231be9b3684249f73d5ce5cbf506839dac421ad9c2e5b462fa83'
  },
  nprofile: {
    valid:
      'nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p',
    pubkeyHex:
      '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d',
    relays: ['wss://r.x.com', 'wss://djbas.sadkb.com']
  },
  nevent: {
    valid:
      'nevent1qqs2ts6rm3m3ggcmaxekssjf7u74eewt75rg88dvggddnsh9k3304qcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mgzyqewrqnkx4zsaweutf739s0cu7et29zrntqs5elw70vlm8zudr3y2qcyqqqqqqgq7p9ql',
    idHex: 'a5c343dc7714231be9b3684249f73d5ce5cbf506839dac421ad9c2e5b462fa83',
    authorHex:
      '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
    relays: ['wss://relay.example.com'],
    kind: 1
  },
  naddr: {
    valid:
      'naddr1qqz8getnwsq3wamnwvaz7tmjv4kxz7fwv4uxzmtsd3jjucm0d5pzqvhpsfmr23gwhv795lgjc8uw0v44z3pe4sg2vlh08k0an3wx3cj9qvzqqqr42vd7sf56',
    identifier: 'test',
    authorHex:
      '32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245',
    relays: ['wss://relay.example.com'],
    kind: 30_035
  },
  invalid: {
    /** Bech32 corrupted by replacing last char. */
    checksum: 'npub1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5a',
    /** Unknown HRP. */
    hrp: 'nxxx1xtscya34g58tk0z605fvr788k263gsu6cy9x0mhnm87echrgufzsevkk5s'
  }
}
