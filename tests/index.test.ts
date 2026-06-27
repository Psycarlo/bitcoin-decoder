// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { SimplePool } from 'nostr-tools/pool'
import { decode, wellKnown } from '../src'
import { ArkAddresses } from './fixtures/ark'
import { bip321URIs } from './fixtures/bip-321'
import { bitcoinAddresses } from './fixtures/bitcoin'
import { extendedKeys } from './fixtures/extended-key'
import { lightningAddresses } from './fixtures/lightning-address'
import { lnurls } from './fixtures/lnurl'
import { nostrEntities } from './fixtures/nostr'
import { nostrProfileFixtures } from './fixtures/nostr-profile'
import { psbts } from './fixtures/psbt'

describe('Bitcoin Decode', () => {
  describe('Bolt11', () => {
    it('should decode a testnet bolt11 invoice', async () => {
      const input =
        'lntbs10u1p5et0y3sp5cp3sp45t3hh84t08gcf49ye8athryy36vjym5q0r65sjxen5qkeqpp57m9wees47jhe83cjvtyaln0lpfne90scfvyhk630eklrpnuvfgqqdq4g9exkgznw3hhyefqyvensxqzjccqp2rzjq2v454h7kjlfx9c6kcfeprd4d7lsn4cmhsngyuvmx9pr6lmepgu0cpzs3yqqqtqqqqqqqqqpqqqqqzsqqc9qxpqysgqsxudq7yy8nq4lmct42eq6rhq4rl76w2u89w35nas4djcdyw4dvz9qs40ta8s9nu8sypwzr6hpsdelgaurn8nw0mr69nnmke7nmma25sqnxeyj0'
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.value).toBe(input)
      expect(result.destination.type).toBe('bolt11')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.network).toBe('testnet')
      expect(result.metadata?.amount).toBe(1000)
      expect(result.metadata?.description).toBe('Ark Store #38')
    })

    it('should decode a mainnet bolt11 invoice', async () => {
      const input =
        'lnbc10u1p5et0xtpp5lmuztz4yunmruy30a3xqgw4ng8m2m8vzx5af48f85t9ymu3gr0esdq823jhxaqcqzzsxqrrsssp5lc3sp7932r379kcmnat4c20cgudp4vhlzwsqjqcvw0gqw27pjv6s9qxpqysgq4a5zpt7227kz33qe4kx3wrzvm2m88nchqq5sjd4p8ezjfpdcxlwy6pw39qwhym7sxesxazyz6ezjv3l7r62musv6jsdn8aqqjw6r50qp32unnk'
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.value).toBe(input)
      expect(result.destination.type).toBe('bolt11')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.network).toBe('mainnet')
      expect(result.metadata?.amount).toBe(1000)
      expect(result.metadata?.description).toBe('Test')
    })
  })

  describe('Bolt12', () => {
    it('should decode a mainnet bolt12 offer', async () => {
      const input =
        'lno1pqps7sjqpgz9getnwsgwuquxfmcztl0gldv8mxy3sm8x5jscdz27u39fy6luxu8zcdn9j73l3upsh07rk5jt5kkev5xadp5d3hulrgyv0m3u4h20h2gz7tzntd45huszqgxxjs85lxz5rc0r3uwfrwgk92pp2a5rdpx9cjrjvjhqyc5x5dkyvqpnclwrc8k5z8atcvvptlwv9dty80qt7378lxt0nhpezz8m9zxzulxftqf399m279led8889uy3rssvlwgmwqpfvg8m5qksdsz8pnhhyvlcgkplzvngwftzjd32qps35mql888hd6sqx2g5k9al75w4p4apqa9gay0gwsquw2pjaqhvuvvmws7k5wan4fae3c3tnt33qh85lekwevhqvaqw5nk2hc'
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.value).toBe(input)
      expect(result.destination.type).toBe('bolt12')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.network).toBe('mainnet')
      expect(result.metadata?.description).toBe('Test')
    })
  })

  describe('Lightning addresses', () => {
    describe('decode', () => {
      it('should decode a valid lightning address (medusa)', async () => {
        const input = lightningAddresses.valid.medusa
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('lnaddress')
        expect(result.destination.protocol).toBe('lightning')
      })

      it('should decode a valid lightning address (wos)', async () => {
        const input = lightningAddresses.valid.wos
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('lnaddress')
        expect(result.destination.protocol).toBe('lightning')
      })

      it('should return invalid for a non-existent lightning address', async () => {
        const result = await decode(lightningAddresses.invalid.notfound)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.errorCode).toBe('INVALID_LNADDRESS')
      })

      it('should return invalid for a lightning address without domain', async () => {
        const result = await decode('user@')

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.errorCode).toBe('INVALID_LNADDRESS')
      })

      it('should return invalid for a lightning address without TLD', async () => {
        const result = await decode('user@domain')

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.errorCode).toBe('INVALID_LNADDRESS')
      })
    })

    describe('wellKnown', () => {
      it('should resolve a valid medusa lightning address', async () => {
        const result = await wellKnown(lightningAddresses.valid.medusa)

        expect(result).not.toBeNull()
        if (!result) {
          return
        }
        expect(result.callback).toBeDefined()
        expect(result.minSendable).toBeDefined()
        expect(result.maxSendable).toBeDefined()
      })

      it('should resolve a valid wos lightning address', async () => {
        const result = await wellKnown(lightningAddresses.valid.wos)

        expect(result).not.toBeNull()
        if (!result) {
          return
        }
        expect(result.callback).toBeDefined()
        expect(result.minSendable).toBeDefined()
        expect(result.maxSendable).toBeDefined()
      })

      it('should return null for an invalid medusa lightning address', async () => {
        const result = await wellKnown(lightningAddresses.invalid.medusa)

        expect(result).toBeNull()
      })

      it('should return null for an invalid wos lightning address', async () => {
        const result = await wellKnown(lightningAddresses.invalid.wos)

        expect(result).toBeNull()
      })
    })
  })

  describe('Payment request', () => {
    it('should decode a lightning: prefixed bolt11 invoice', async () => {
      const invoice =
        'lnbc10u1p5et0xtpp5lmuztz4yunmruy30a3xqgw4ng8m2m8vzx5af48f85t9ymu3gr0esdq823jhxaqcqzzsxqrrsssp5lc3sp7932r379kcmnat4c20cgudp4vhlzwsqjqcvw0gqw27pjv6s9qxpqysgq4a5zpt7227kz33qe4kx3wrzvm2m88nchqq5sjd4p8ezjfpdcxlwy6pw39qwhym7sxesxazyz6ezjv3l7r62musv6jsdn8aqqjw6r50qp32unnk'
      const input = `lightning:${invoice}`
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.value).toBe(invoice)
      expect(result.destination.type).toBe('bolt11')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.network).toBe('mainnet')
      expect(result.metadata?.amount).toBe(1000)
      expect(result.metadata?.description).toBe('Test')
    })
  })

  describe('LNURL', () => {
    it('should decode a valid LNURL (medusa)', async () => {
      const input = lnurls.valid.medusa
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.value).toBe(input)
      expect(result.destination.type).toBe('lnurl')
      expect(result.destination.protocol).toBe('lightning')
    })
  })

  describe('BIP-321', () => {
    it('should decode a BIP-321 URI with lightning parameter', async () => {
      const lightning =
        'LNTBS10U1P5ET0Y3SP5CP3SP45T3HH84T08GCF49YE8ATHRYY36VJYM5Q0R65SJXEN5QKEQPP57M9WEES47JHE83CJVTYALN0LPFNE90SCFVYHK630EKLRPNUVFGQQDQ4G9EXKGZNW3HHYEFQYVENSXQZJCCQP2RZJQ2V454H7KJLFX9C6KCFEPRD4D7LSN4CMHSNGYUVMX9PR6LMEPGU0CPZS3YQQQTQQQQQQQQQPQQQQQZSQQC9QXPQYSGQSXUDQ7YY8NQ4LMCT42EQ6RHQ4RL76W2U89W35NAS4DJCDYW4DVZ9QS40TA8S9NU8SYPWZR6HPSDELGAURN8NW0MR69NNMKE7NMMA25SQNXEYJ0'
      const input = `bitcoin:?amount=0.00001&label=Byte%20Store&message=Kibbles%20'n%20Bits&lightning=${lightning}`
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.value).toBe(lightning.toLowerCase())
      expect(result.destination.type).toBe('bolt11')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.network).toBe('testnet')
      expect(result.metadata?.amount).toBe(1000)
      expect(result.metadata?.description).toBe('Ark Store #38')
    })

    it('should decode a BIP-321 URI with lightning address and ark', async () => {
      const input = bip321URIs.lightningAddressWithArk
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.value).toBe('psycarlo@medusa.bz')
      expect(result.destination.type).toBe('lnaddress')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.destinations).toHaveLength(2)
      expect(result.destinations[1]?.type).toBe('ark-address')
      expect(result.destinations[1]?.protocol).toBe('ark')
    })

    it('should propagate URI metadata to an ark-first destination', async () => {
      const arkAddr = ArkAddresses.testnet.valid.bark
      const input = `bitcoin:?ark=${arkAddr}&amount=0.0001&label=Coffee&message=Thanks`
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.destination.type).toBe('ark-address')
      expect(result.metadata?.amount).toBe(10_000)
      expect(result.metadata?.description).toBe('Thanks')
    })

    it('should let BOLT11 invoice amount win over URI amount', async () => {
      const lightning =
        'LNTBS10U1P5ET0Y3SP5CP3SP45T3HH84T08GCF49YE8ATHRYY36VJYM5Q0R65SJXEN5QKEQPP57M9WEES47JHE83CJVTYALN0LPFNE90SCFVYHK630EKLRPNUVFGQQDQ4G9EXKGZNW3HHYEFQYVENSXQZJCCQP2RZJQ2V454H7KJLFX9C6KCFEPRD4D7LSN4CMHSNGYUVMX9PR6LMEPGU0CPZS3YQQQTQQQQQQQQQPQQQQQZSQQC9QXPQYSGQSXUDQ7YY8NQ4LMCT42EQ6RHQ4RL76W2U89W35NAS4DJCDYW4DVZ9QS40TA8S9NU8SYPWZR6HPSDELGAURN8NW0MR69NNMKE7NMMA25SQNXEYJ0'
      const input = `bitcoin:?amount=0.5&lightning=${lightning}`
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.destination.type).toBe('bolt11')
      expect(result.metadata?.amount).toBe(1000)
      expect(result.metadata?.description).toBe('Ark Store #38')
    })

    it('should propagate URI amount when both ark and lightning are present', async () => {
      const arkAddr = ArkAddresses.testnet.valid.bark
      const input = `bitcoin:?ark=${arkAddr}&amount=0.00042`
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.destination.type).toBe('ark-address')
      expect(result.metadata?.amount).toBe(42_000)
    })

    it('should decode a BIP-321 URI with bolt12 offer parameter', async () => {
      const offer =
        'lno1pqps7sjqpgz9getnwsgwuquxfmcztl0gldv8mxy3sm8x5jscdz27u39fy6luxu8zcdn9j73l3upsh07rk5jt5kkev5xadp5d3hulrgyv0m3u4h20h2gz7tzntd45huszqgxxjs85lxz5rc0r3uwfrwgk92pp2a5rdpx9cjrjvjhqyc5x5dkyvqpnclwrc8k5z8atcvvptlwv9dty80qt7378lxt0nhpezz8m9zxzulxftqf399m279led8889uy3rssvlwgmwqpfvg8m5qksdsz8pnhhyvlcgkplzvngwftzjd32qps35mql888hd6sqx2g5k9al75w4p4apqa9gay0gwsquw2pjaqhvuvvmws7k5wan4fae3c3tnt33qh85lekwevhqvaqw5nk2hc'
      const input = `bitcoin:?lno=${offer}`
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.value).toBe(offer)
      expect(result.destination.type).toBe('bolt12')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.network).toBe('mainnet')
    })
  })

  describe('Bitcoin addresses', () => {
    describe('Mainnet', () => {
      it('should decode a valid P2PKH address', async () => {
        const input = bitcoinAddresses.mainnet.p2pkh.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2pkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('mainnet')
      })

      it('should return invalid for a P2PKH address with bad checksum', async () => {
        const input = bitcoinAddresses.mainnet.p2pkh.invalid.checksum
        const result = await decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })

      it('should decode a valid P2SH address', async () => {
        const input = bitcoinAddresses.mainnet.p2sh.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2sh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('mainnet')
      })

      it('should return invalid for a P2SH address with bad checksum', async () => {
        const input = bitcoinAddresses.mainnet.p2sh.invalid.checksum
        const result = await decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })

      it('should decode a valid P2TR address', async () => {
        const input = bitcoinAddresses.mainnet.p2tr.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2tr')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('mainnet')
      })

      it('should return invalid for a P2TR address with bad checksum', async () => {
        const input = bitcoinAddresses.mainnet.p2tr.invalid.checksum
        const result = await decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })
    })

    describe('Testnet', () => {
      it('should decode a valid P2PKH address', async () => {
        const input = bitcoinAddresses.testnet.p2pkh.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2pkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should return invalid for a P2PKH address with bad checksum', async () => {
        const input = bitcoinAddresses.testnet.p2pkh.invalid.checksum
        const result = await decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })

      it('should decode a valid P2SH address', async () => {
        const input = bitcoinAddresses.testnet.p2sh.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2sh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should return invalid for a P2SH address with bad checksum', async () => {
        const input = bitcoinAddresses.testnet.p2sh.invalid.checksum
        const result = await decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })

      it('should decode a valid P2WPKH address', async () => {
        const input = bitcoinAddresses.testnet.p2wpkh.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2wpkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should return invalid for a P2WPKH address with bad checksum', async () => {
        const input = bitcoinAddresses.testnet.p2wpkh.invalid.checksum
        const result = await decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })

      it('should decode a valid P2TR address', async () => {
        const input = bitcoinAddresses.testnet.p2tr.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2tr')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should return invalid for a P2TR address with bad checksum', async () => {
        const input = bitcoinAddresses.testnet.p2tr.invalid.checksum
        const result = await decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })
    })

    describe('Signet', () => {
      it('should decode a valid P2PKH address (m prefix)', async () => {
        const input = bitcoinAddresses.signet.p2pkh.valid.m
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2pkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should decode a valid P2PKH address (n prefix)', async () => {
        const input = bitcoinAddresses.signet.p2pkh.valid.n
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2pkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should return invalid for a P2PKH address with bad checksum', async () => {
        const input = bitcoinAddresses.signet.p2pkh.invalid
        const result = await decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })

      it('should decode a valid P2SH address', async () => {
        const input = bitcoinAddresses.signet.p2sh.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2sh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should decode a valid P2TR address', async () => {
        const input = bitcoinAddresses.signet.p2tr.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2tr')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should return invalid for a P2TR address with bad checksum', async () => {
        const input = bitcoinAddresses.signet.p2tr.invalid
        const result = await decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })
    })

    describe('Regtest', () => {
      it('should decode a valid P2PKH address (m prefix)', async () => {
        const input = bitcoinAddresses.regtest.p2pkh.valid.m
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2pkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should decode a valid P2PKH address (n prefix)', async () => {
        const input = bitcoinAddresses.regtest.p2pkh.valid.n
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2pkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should decode a valid P2SH address', async () => {
        const input = bitcoinAddresses.regtest.p2sh.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2sh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should decode a valid P2WPKH address', async () => {
        const input = bitcoinAddresses.regtest.p2wpkh.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2wpkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should decode a valid P2WSH address', async () => {
        const input = bitcoinAddresses.regtest.p2wsh.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2wsh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should decode a valid P2TR address', async () => {
        const input = bitcoinAddresses.regtest.p2tr.valid
        const result = await decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.value).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2tr')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })
    })

    it('should return invalid for a P2PKH address with wrong decoded length', async () => {
      const input = bitcoinAddresses.mainnet.p2pkh.invalid.length
      const result = await decode(input)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.errorCode).toBe('PAYLOAD_TOO_SHORT')
      expect(result.errorMessage).toBeDefined()
    })

    it('should return invalid for a P2WPKH address with wrong program length', async () => {
      const input = bitcoinAddresses.mainnet.p2wpkh.invalid.programLength
      const result = await decode(input)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.errorCode).toBe('PAYLOAD_TOO_SHORT')
      expect(result.errorMessage).toBeDefined()
    })

    it('should return invalid for a P2TR address with wrong program length', async () => {
      const input = bitcoinAddresses.mainnet.p2tr.invalid.programLength
      const result = await decode(input)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.errorCode).toBe('PAYLOAD_TOO_SHORT')
      expect(result.errorMessage).toBeDefined()
    })
  })

  describe('Ark addresses', () => {
    it('should decode a testnet ark (bark) address', async () => {
      const input = ArkAddresses.testnet.valid.bark
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.value).toBe(input)
      expect(result.destination.type).toBe('ark-address')
      expect(result.destination.protocol).toBe('ark')
      expect(result.network).toBe('testnet')
    })

    it('should decode a testnet ark (arkade) address', async () => {
      const input = ArkAddresses.testnet.valid.arkade
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.value).toBe(input)
      expect(result.destination.type).toBe('ark-address')
      expect(result.destination.protocol).toBe('ark')
      expect(result.network).toBe('testnet')
    })

    it('should return invalid for an ark address with bad checksum', async () => {
      const input = ArkAddresses.testnet.invalid.checksum
      const result = await decode(input)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.errorCode).toBe('INVALID_CHECKSUM')
      expect(result.errorMessage).toBeDefined()
    })

    it('should return invalid for an incomplete testnet ark address', async () => {
      const input = ArkAddresses.testnet.invalid.incomplete
      const result = await decode(input)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.errorCode).toBe('INVALID_CHECKSUM')
      expect(result.errorMessage).toBeDefined()
    })
  })

  describe('Nostr (NIP-19)', () => {
    it('should decode an npub', async () => {
      const input = nostrEntities.npub.valid
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.kind).toBe('nostr')
      expect(result.input).toBe(input)
      expect(result.entity.type).toBe('npub')
      expect(result.entity.data.hex).toBe(nostrEntities.npub.pubkeyHex)
    })

    it('should decode an nsec', async () => {
      const input = nostrEntities.nsec.valid
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.kind).toBe('nostr')
      expect(result.entity.type).toBe('nsec')
      expect(result.entity.data.hex).toBe(nostrEntities.nsec.privkeyHex)
    })

    it('should decode a note', async () => {
      const input = nostrEntities.note.valid
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.kind).toBe('nostr')
      expect(result.entity.type).toBe('note')
      expect(result.entity.data.hex).toBe(nostrEntities.note.eventIdHex)
    })

    it('should decode an nprofile with relays', async () => {
      const input = nostrEntities.nprofile.valid
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.kind).toBe('nostr')
      expect(result.entity.type).toBe('nprofile')
      expect(result.entity.data.pubkey).toBe(nostrEntities.nprofile.pubkeyHex)
      expect(result.entity.data.relays).toEqual(nostrEntities.nprofile.relays)
    })

    it('should decode an nevent with author and kind', async () => {
      const input = nostrEntities.nevent.valid
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.kind).toBe('nostr')
      expect(result.entity.type).toBe('nevent')
      expect(result.entity.data.id).toBe(nostrEntities.nevent.idHex)
      expect(result.entity.data.author).toBe(nostrEntities.nevent.authorHex)
      expect(result.entity.data.kind).toBe(nostrEntities.nevent.kind)
      expect(result.entity.data.relays).toEqual(nostrEntities.nevent.relays)
    })

    it('should decode an naddr', async () => {
      const input = nostrEntities.naddr.valid
      const result = await decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.kind).toBe('nostr')
      expect(result.entity.type).toBe('naddr')
      expect(result.entity.data.identifier).toBe(nostrEntities.naddr.identifier)
      expect(result.entity.data.author).toBe(nostrEntities.naddr.authorHex)
      expect(result.entity.data.kind).toBe(nostrEntities.naddr.kind)
      expect(result.entity.data.relays).toEqual(nostrEntities.naddr.relays)
    })

    it('should return invalid for an npub with bad checksum', async () => {
      const input = nostrEntities.invalid.checksum
      const result = await decode(input)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.errorCode).toBe('INVALID_NIP19')
    })
  })

  describe('Nostr profile fetch (mocked)', () => {
    let querySpy: ReturnType<typeof spyOn>
    let closeSpy: ReturnType<typeof spyOn>

    beforeEach(() => {
      querySpy = spyOn(SimplePool.prototype, 'querySync')
      closeSpy = spyOn(SimplePool.prototype, 'close').mockImplementation(
        () => undefined
      )
    })

    afterEach(() => {
      querySpy.mockRestore()
      closeSpy.mockRestore()
    })

    it('skips profile fetch by default', async () => {
      const result = await decode(nostrProfileFixtures.npub)

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'nostr') {
        return
      }
      if (result.entity.type !== 'npub') {
        return
      }
      expect(result.entity.data.profile).toBeUndefined()
      expect(querySpy).not.toHaveBeenCalled()
    })

    it('returns ok status with parsed profile for npub', async () => {
      querySpy.mockResolvedValue([nostrProfileFixtures.validEvent])

      const result = await decode(nostrProfileFixtures.npub, {
        nostr: { fetchProfile: true }
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
      if (profile?.status !== 'ok') {
        return
      }
      expect(profile.data.name).toBe('alice')
      expect(profile.data.displayName).toBe('Alice')
      expect(profile.data.nip05).toBe('alice@example.com')
      expect(profile.data.lud16).toBe('alice@wallet.example')
      expect(profile.data.website).toBe('https://alice.example')
      expect(profile.data.bot).toBe(false)
    })

    it('returns not-found when relays yield no events', async () => {
      querySpy.mockResolvedValue([])

      const result = await decode(nostrProfileFixtures.npub, {
        nostr: { fetchProfile: true }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'nostr') {
        return
      }
      if (result.entity.type !== 'npub') {
        return
      }
      expect(result.entity.data.profile?.status).toBe('not-found')
    })

    it('returns error when pool throws', async () => {
      querySpy.mockRejectedValue(new Error('boom'))

      const result = await decode(nostrProfileFixtures.npub, {
        nostr: { fetchProfile: true }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'nostr') {
        return
      }
      if (result.entity.type !== 'npub') {
        return
      }
      const profile = result.entity.data.profile
      expect(profile?.status).toBe('error')
      if (profile?.status === 'error') {
        expect(profile.message).toBe('boom')
      }
    })

    it('returns error when content is malformed JSON', async () => {
      querySpy.mockResolvedValue([nostrProfileFixtures.malformedContent])

      const result = await decode(nostrProfileFixtures.npub, {
        nostr: { fetchProfile: true, verify: false }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'nostr') {
        return
      }
      if (result.entity.type !== 'npub') {
        return
      }
      const profile = result.entity.data.profile
      expect(profile?.status).toBe('error')
      if (profile?.status === 'error') {
        expect(profile.message).toBe('Invalid profile JSON')
      }
    })

    it('rejects events with bad signatures when verify is true', async () => {
      querySpy.mockResolvedValue([nostrProfileFixtures.badSig])

      const result = await decode(nostrProfileFixtures.npub, {
        nostr: { fetchProfile: true, verify: true }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'nostr') {
        return
      }
      if (result.entity.type !== 'npub') {
        return
      }
      const profile = result.entity.data.profile
      expect(profile?.status).toBe('error')
      if (profile?.status === 'error') {
        expect(profile.message).toBe('Invalid event signature')
      }
    })

    it('selects newest event when multiple are returned', async () => {
      querySpy.mockResolvedValue([
        nostrProfileFixtures.oldEvent,
        nostrProfileFixtures.newerEvent,
        nostrProfileFixtures.validEvent
      ])

      const result = await decode(nostrProfileFixtures.npub, {
        nostr: { fetchProfile: true, verify: false }
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
        expect(profile.data.name).toBe('newest-alice')
      }
    })
  })

  describe('Transaction', () => {
    const TXID =
      'a16f3ce4dd5deb92d98ef5cf8afeaf0775ebca408f708b2146c4fb42b41e14be'
    const ESPLORA_TX_JSON = {
      txid: TXID,
      version: 1,
      locktime: 0,
      vin: [
        {
          txid: 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16',
          vout: 1,
          prevout: {
            scriptpubkey_type: 'p2pk',
            scriptpubkey_address: undefined,
            value: 5_000_000_000
          },
          sequence: 4_294_967_295,
          is_coinbase: false
        }
      ],
      vout: [
        {
          scriptpubkey_type: 'p2pk',
          scriptpubkey_address: undefined,
          value: 1_000_000_000
        },
        {
          scriptpubkey_type: 'p2pk',
          scriptpubkey_address: undefined,
          value: 3_000_000_000
        }
      ],
      size: 275,
      weight: 1100,
      fee: 0,
      status: {
        confirmed: true,
        block_height: 181,
        block_hash:
          '00000000dc55860c8a29c58d45209318fa9e9dc2c1833a7226d86bc465afc6e5',
        block_time: 1_231_740_133
      }
    }
    const COINBASE_TXID =
      '8c14f0db3df150123e6f3dbbf30f8b955a8249b62ac1d1ff16284aefa3d06d87'
    const COINBASE_TX_JSON = {
      txid: COINBASE_TXID,
      version: 1,
      locktime: 0,
      vin: [
        {
          txid: '0000000000000000000000000000000000000000000000000000000000000000',
          vout: 4_294_967_295,
          prevout: null,
          sequence: 4_294_967_295,
          is_coinbase: true
        }
      ],
      vout: [
        {
          scriptpubkey_type: 'p2pk',
          scriptpubkey_address: undefined,
          value: 5_000_000_000
        }
      ],
      size: 135,
      weight: 540,
      fee: 0,
      status: {
        confirmed: true,
        block_height: 100_000,
        block_hash:
          '000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506',
        block_time: 1_293_623_863
      }
    }
    const MINER_BLOCK_JSON = {
      extras: { pool: { id: 1, name: 'TestPool', slug: 'testpool' } }
    }

    function mockFetchOk(body: unknown) {
      return spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(body), { status: 200 })
      )
    }

    function mockFetchSequence(bodies: unknown[]) {
      const spy = spyOn(globalThis, 'fetch')
      for (const body of bodies) {
        spy.mockResolvedValueOnce(
          new Response(JSON.stringify(body), { status: 200 })
        )
      }
      return spy
    }

    afterEach(() => {
      ;(
        globalThis.fetch as unknown as { mockRestore?: () => void }
      ).mockRestore?.()
    })

    it('decodes txid offline (no fetch) and echoes it back lowercased', async () => {
      const result = await decode(TXID.toUpperCase())

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      expect(result.txid).toBe(TXID)
      expect(result.data).toBeUndefined()
    })

    it('treats non-64-hex strings as non-tx (unknown format)', async () => {
      const result = await decode('zzz_not_a_txid')

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.errorCode).toBe('UNKNOWN_FORMAT')
    })

    it('fetches transaction data when fetch=true and hits default mainnet endpoint', async () => {
      const fetchSpy = mockFetchOk(ESPLORA_TX_JSON)

      const result = await decode(TXID, { transaction: { fetch: true } })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      expect(result.data).toBeDefined()
      expect(result.data?.network).toBe('mainnet')
      expect(result.data?.fee).toBe(0)
      expect(result.data?.totalInput).toBe(5_000_000_000)
      expect(result.data?.totalOutput).toBe(4_000_000_000)
      expect(result.data?.vsize).toBe(275)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const url = fetchSpy.mock.calls[0][0] as string
      expect(url).toBe(`https://mempool.space/api/tx/${TXID}`)
    })

    it('uses testnet4 endpoint when network=testnet', async () => {
      const fetchSpy = mockFetchOk(ESPLORA_TX_JSON)

      await decode(TXID, {
        transaction: { fetch: true, network: 'testnet' }
      })

      const url = fetchSpy.mock.calls[0][0] as string
      expect(url).toBe(`https://mempool.space/testnet4/api/tx/${TXID}`)
    })

    it('uses signet endpoint when network=signet', async () => {
      const fetchSpy = mockFetchOk(ESPLORA_TX_JSON)

      await decode(TXID, {
        transaction: { fetch: true, network: 'signet' }
      })

      const url = fetchSpy.mock.calls[0][0] as string
      expect(url).toBe(`https://mempool.space/signet/api/tx/${TXID}`)
    })

    it('uses custom endpoint when provided and strips trailing slash', async () => {
      const fetchSpy = mockFetchOk(ESPLORA_TX_JSON)

      await decode(TXID, {
        transaction: {
          fetch: true,
          endpoint: 'http://localhost:3000/api/'
        }
      })

      const url = fetchSpy.mock.calls[0][0] as string
      expect(url).toBe(`http://localhost:3000/api/tx/${TXID}`)
    })

    it('returns TX_FETCH_ERROR when regtest has no endpoint', async () => {
      const result = await decode(TXID, {
        transaction: { fetch: true, network: 'regtest' }
      })

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.errorCode).toBe('TX_FETCH_ERROR')
    })

    it('decodes coinbase: isCoinbase=true, no prevout, totalInput=0', async () => {
      mockFetchOk(COINBASE_TX_JSON)

      const result = await decode(COINBASE_TXID, {
        transaction: { fetch: true }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      expect(result.data?.inputs[0].isCoinbase).toBe(true)
      expect(result.data?.inputs[0].prevout).toBeUndefined()
      expect(result.data?.totalInput).toBe(0)
    })

    it('fetches miner pool when fetchMiner=true and tx is confirmed', async () => {
      const fetchSpy = mockFetchSequence([ESPLORA_TX_JSON, MINER_BLOCK_JSON])

      const result = await decode(TXID, {
        transaction: { fetch: true, fetchMiner: true }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      expect(result.data?.miner).toEqual({ name: 'TestPool', slug: 'testpool' })
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      const blockUrl = fetchSpy.mock.calls[1][0] as string
      expect(blockUrl).toBe(
        `https://mempool.space/api/v1/block/${ESPLORA_TX_JSON.status.block_hash}`
      )
    })

    it('omits miner when fetchMiner=true and block pool is missing', async () => {
      mockFetchSequence([ESPLORA_TX_JSON, { extras: {} }])

      const result = await decode(TXID, {
        transaction: { fetch: true, fetchMiner: true }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'transaction') {
        return
      }
      expect(result.data?.miner).toBeUndefined()
    })

    it('returns TX_NOT_FOUND on 404 from indexer', async () => {
      spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Not Found', { status: 404 })
      )

      const result = await decode(TXID, { transaction: { fetch: true } })

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.errorCode).toBe('TX_NOT_FOUND')
    })

    it('returns TX_FETCH_ERROR on non-200/404 indexer response', async () => {
      spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Server Error', { status: 500 })
      )

      const result = await decode(TXID, { transaction: { fetch: true } })

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.errorCode).toBe('TX_FETCH_ERROR')
    })

    it('returns TX_TIMEOUT when AbortController fires', async () => {
      spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          const signal = (init as RequestInit | undefined)?.signal
          signal?.addEventListener('abort', () => {
            const err = new Error('aborted')
            err.name = 'AbortError'
            reject(err)
          })
        })
      })

      const result = await decode(TXID, {
        transaction: { fetch: true, timeout: 10 }
      })

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.errorCode).toBe('TX_TIMEOUT')
    })
  })

  describe('Extended keys', () => {
    const cases = [
      extendedKeys.zpub,
      extendedKeys.xpub,
      extendedKeys.xprv,
      extendedKeys.ypub,
      extendedKeys.zprv,
      extendedKeys.Zpub,
      extendedKeys.tpub,
      extendedKeys.vpub,
      extendedKeys.Uprv
    ]

    for (const fixture of cases) {
      it(`should decode ${fixture.type}`, async () => {
        const result = await decode(fixture.valid)

        expect(result.valid).toBe(true)
        if (!result.valid || result.kind !== 'key') {
          return
        }
        expect(result.input).toBe(fixture.valid)
        expect(result.key.type).toBe(fixture.type)
        expect(result.key.scriptType).toBe(fixture.scriptType)
        expect(result.key.network).toBe(fixture.network)
        expect(result.key.isPrivate).toBe(fixture.isPrivate)
      })
    }

    it('should expose full BIP-32 fields for a public key', async () => {
      const fixture = extendedKeys.zpub
      const result = await decode(fixture.valid)

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'key') {
        return
      }
      expect(result.key.depth).toBe(fixture.depth)
      expect(result.key.parentFingerprint).toBe(fixture.parentFingerprint)
      expect(result.key.childNumber).toBe(fixture.childNumber)
      expect(result.key.index).toBe(0)
      expect(result.key.hardened).toBe(false)
      expect(result.key.chainCode).toBe(fixture.chainCode)
      expect(result.key.key).toBe(fixture.key)
      expect(result.key.fingerprint).toBe(fixture.fingerprint)
    })

    it('should not expose a fingerprint for private keys', async () => {
      const result = await decode(extendedKeys.xprv.valid)

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'key') {
        return
      }
      expect(result.key.fingerprint).toBeUndefined()
    })

    it('should reject an extended key with a bad checksum', async () => {
      const result = await decode(extendedKeys.invalidChecksum)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.errorCode).toBe('INVALID_EXTENDED_KEY')
    })
  })

  describe('PSBT', () => {
    it('should decode a BIP-174 creator PSBT (base64)', async () => {
      const fixture = psbts.creator
      const result = await decode(fixture.valid)

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'psbt') {
        return
      }
      expect(result.data.version).toBe(fixture.version)
      expect(result.data.txVersion).toBe(fixture.txVersion)
      expect(result.data.locktime).toBe(fixture.locktime)
      expect(result.data.inputCount).toBe(fixture.inputCount)
      expect(result.data.outputCount).toBe(fixture.outputCount)
      expect(result.data.totalOutput).toBe(fixture.totalOutput)
      expect(result.data.outputs[0].address).toBe(fixture.outputs[0].address)
      expect(result.data.outputs[0].value).toBe(fixture.outputs[0].value)
      expect(result.data.outputs[1].address).toBe(fixture.outputs[1].address)
      // No UTXO data, so the input value and fee are unknown.
      expect(result.data.totalInput).toBeUndefined()
      expect(result.data.fee).toBeUndefined()
    })

    it('should decode the same PSBT supplied as hex', async () => {
      const { hex } = await import('@scure/base')
      const { base64 } = await import('@scure/base')
      const hexInput = hex.encode(base64.decode(psbts.creator.valid))
      const result = await decode(hexInput)

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'psbt') {
        return
      }
      expect(result.data.outputCount).toBe(2)
    })

    it('should derive input value and fee from a witness UTXO', async () => {
      const fixture = psbts.withWitnessUtxo
      const result = await decode(fixture.valid)

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'psbt') {
        return
      }
      expect(result.data.inputs[0].witnessUtxo).toBe(true)
      expect(result.data.inputs[0].value).toBe(fixture.inputValue)
      expect(result.data.totalInput).toBe(fixture.totalInput)
      expect(result.data.totalOutput).toBe(fixture.totalOutput)
      expect(result.data.fee).toBe(fixture.fee)
    })

    it('should encode output addresses for the requested network', async () => {
      const result = await decode(psbts.creator.valid, {
        psbt: { network: 'testnet' }
      })

      expect(result.valid).toBe(true)
      if (!result.valid || result.kind !== 'psbt') {
        return
      }
      const first = result.data.outputs[0].address ?? ''
      expect(first.startsWith('m') || first.startsWith('n')).toBe(true)
    })

    it('should reject a malformed PSBT', async () => {
      const result = await decode(psbts.invalid)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.errorCode).toBe('INVALID_PSBT')
    })
  })
})
