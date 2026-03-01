// @ts-nocheck
import { describe, expect, it } from 'bun:test'
import { decode, wellKnown } from '../src'
import { ArkAddresses } from './fixtures/ark'
import { bitcoinAddresses } from './fixtures/bitcoin'
import { lightningAddresses } from './fixtures/lightning-address'

describe('Bitcoin Decode', () => {
  describe('Bolt11', () => {
    it('should decode a testnet bolt11 invoice', () => {
      const input =
        'lntbs10u1p5et0y3sp5cp3sp45t3hh84t08gcf49ye8athryy36vjym5q0r65sjxen5qkeqpp57m9wees47jhe83cjvtyaln0lpfne90scfvyhk630eklrpnuvfgqqdq4g9exkgznw3hhyefqyvensxqzjccqp2rzjq2v454h7kjlfx9c6kcfeprd4d7lsn4cmhsngyuvmx9pr6lmepgu0cpzs3yqqqtqqqqqqqqqpqqqqqzsqqc9qxpqysgqsxudq7yy8nq4lmct42eq6rhq4rl76w2u89w35nas4djcdyw4dvz9qs40ta8s9nu8sypwzr6hpsdelgaurn8nw0mr69nnmke7nmma25sqnxeyj0'
      const result = decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.destination).toBe(input)
      expect(result.destination.type).toBe('bolt11')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.network).toBe('testnet')
      expect(result.metadata?.amount).toBe(1000)
      expect(result.metadata?.description).toBe('Ark Store #38')
    })

    it('should decode a mainnet bolt11 invoice', () => {
      const input =
        'lnbc10u1p5et0xtpp5lmuztz4yunmruy30a3xqgw4ng8m2m8vzx5af48f85t9ymu3gr0esdq823jhxaqcqzzsxqrrsssp5lc3sp7932r379kcmnat4c20cgudp4vhlzwsqjqcvw0gqw27pjv6s9qxpqysgq4a5zpt7227kz33qe4kx3wrzvm2m88nchqq5sjd4p8ezjfpdcxlwy6pw39qwhym7sxesxazyz6ezjv3l7r62musv6jsdn8aqqjw6r50qp32unnk'
      const result = decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.destination).toBe(input)
      expect(result.destination.type).toBe('bolt11')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.network).toBe('mainnet')
      expect(result.metadata?.amount).toBe(1000)
      expect(result.metadata?.description).toBe('Test')
    })
  })

  describe('Bolt12', () => {
    it('should decode a mainnet bolt12 offer', () => {
      const input =
        'lno1pqps7sjqpgz9getnwsgwuquxfmcztl0gldv8mxy3sm8x5jscdz27u39fy6luxu8zcdn9j73l3upsh07rk5jt5kkev5xadp5d3hulrgyv0m3u4h20h2gz7tzntd45huszqgxxjs85lxz5rc0r3uwfrwgk92pp2a5rdpx9cjrjvjhqyc5x5dkyvqpnclwrc8k5z8atcvvptlwv9dty80qt7378lxt0nhpezz8m9zxzulxftqf399m279led8889uy3rssvlwgmwqpfvg8m5qksdsz8pnhhyvlcgkplzvngwftzjd32qps35mql888hd6sqx2g5k9al75w4p4apqa9gay0gwsquw2pjaqhvuvvmws7k5wan4fae3c3tnt33qh85lekwevhqvaqw5nk2hc'
      const result = decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.destination).toBe(input)
      expect(result.destination.type).toBe('bolt12')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.network).toBe('mainnet')
      expect(result.metadata?.description).toBe('Test')
    })
  })

  describe('Lightning addresses', () => {
    describe('decode', () => {
      it('should decode a valid lightning address (medusa)', () => {
        const input = lightningAddresses.valid.medusa
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('lnaddress')
        expect(result.destination.protocol).toBe('lightning')
      })

      it('should decode a valid lightning address (wos)', () => {
        const input = lightningAddresses.valid.wos
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('lnaddress')
        expect(result.destination.protocol).toBe('lightning')
      })

      it('should return invalid for a lightning address without domain', () => {
        const result = decode('user@')

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.errorCode).toBe('INVALID_LNADDRESS')
      })

      it('should return invalid for a lightning address without TLD', () => {
        const result = decode('user@domain')

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

        expect(result).not.toBe(false)
        if (!result) {
          return
        }
        expect(result.callback).toBeDefined()
        expect(result.minSendable).toBeDefined()
        expect(result.maxSendable).toBeDefined()
      })

      it('should resolve a valid wos lightning address', async () => {
        const result = await wellKnown(lightningAddresses.valid.wos)

        expect(result).not.toBe(false)
        if (!result) {
          return
        }
        expect(result.callback).toBeDefined()
        expect(result.minSendable).toBeDefined()
        expect(result.maxSendable).toBeDefined()
      })

      it('should return false for an invalid medusa lightning address', async () => {
        const result = await wellKnown(lightningAddresses.invalid.medusa)

        expect(result).toBe(false)
      })

      it('should return false for an invalid wos lightning address', async () => {
        const result = await wellKnown(lightningAddresses.invalid.wos)

        expect(result).toBe(false)
      })
    })
  })

  describe('Payment request', () => {
    it('should decode a lightning: prefixed bolt11 invoice', () => {
      const invoice =
        'lnbc10u1p5et0xtpp5lmuztz4yunmruy30a3xqgw4ng8m2m8vzx5af48f85t9ymu3gr0esdq823jhxaqcqzzsxqrrsssp5lc3sp7932r379kcmnat4c20cgudp4vhlzwsqjqcvw0gqw27pjv6s9qxpqysgq4a5zpt7227kz33qe4kx3wrzvm2m88nchqq5sjd4p8ezjfpdcxlwy6pw39qwhym7sxesxazyz6ezjv3l7r62musv6jsdn8aqqjw6r50qp32unnk'
      const input = `lightning:${invoice}`
      const result = decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.destination).toBe(invoice)
      expect(result.destination.type).toBe('bolt11')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.network).toBe('mainnet')
      expect(result.metadata?.amount).toBe(1000)
      expect(result.metadata?.description).toBe('Test')
    })
  })

  // describe('LNURL', () => {})

  describe('BIP-321', () => {
    it('should decode a BIP-321 URI with lightning parameter', () => {
      const lightning =
        'LNTBS10U1P5ET0Y3SP5CP3SP45T3HH84T08GCF49YE8ATHRYY36VJYM5Q0R65SJXEN5QKEQPP57M9WEES47JHE83CJVTYALN0LPFNE90SCFVYHK630EKLRPNUVFGQQDQ4G9EXKGZNW3HHYEFQYVENSXQZJCCQP2RZJQ2V454H7KJLFX9C6KCFEPRD4D7LSN4CMHSNGYUVMX9PR6LMEPGU0CPZS3YQQQTQQQQQQQQQPQQQQQZSQQC9QXPQYSGQSXUDQ7YY8NQ4LMCT42EQ6RHQ4RL76W2U89W35NAS4DJCDYW4DVZ9QS40TA8S9NU8SYPWZR6HPSDELGAURN8NW0MR69NNMKE7NMMA25SQNXEYJ0'
      const input = `bitcoin:?amount=0.00001&label=Byte%20Store&message=Kibbles%20'n%20Bits&lightning=${lightning}`
      const result = decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.destination).toBe(lightning.toLowerCase())
      expect(result.destination.type).toBe('bolt11')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.network).toBe('testnet')
      expect(result.metadata?.amount).toBe(1000)
      expect(result.metadata?.description).toBe('Ark Store #38')
    })

    it('should decode a BIP-321 URI with bolt12 offer parameter', () => {
      const offer =
        'lno1pqps7sjqpgz9getnwsgwuquxfmcztl0gldv8mxy3sm8x5jscdz27u39fy6luxu8zcdn9j73l3upsh07rk5jt5kkev5xadp5d3hulrgyv0m3u4h20h2gz7tzntd45huszqgxxjs85lxz5rc0r3uwfrwgk92pp2a5rdpx9cjrjvjhqyc5x5dkyvqpnclwrc8k5z8atcvvptlwv9dty80qt7378lxt0nhpezz8m9zxzulxftqf399m279led8889uy3rssvlwgmwqpfvg8m5qksdsz8pnhhyvlcgkplzvngwftzjd32qps35mql888hd6sqx2g5k9al75w4p4apqa9gay0gwsquw2pjaqhvuvvmws7k5wan4fae3c3tnt33qh85lekwevhqvaqw5nk2hc'
      const input = `bitcoin:?lno=${offer}`
      const result = decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.destination).toBe(offer)
      expect(result.destination.type).toBe('bolt12')
      expect(result.destination.protocol).toBe('lightning')
      expect(result.network).toBe('mainnet')
    })
  })

  describe('Bitcoin addresses', () => {
    describe('Mainnet', () => {
      it('should decode a valid P2PKH address', () => {
        const input = bitcoinAddresses.mainnet.p2pkh.valid
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2pkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('mainnet')
      })

      it('should return invalid for a P2PKH address with bad checksum', () => {
        const input = bitcoinAddresses.mainnet.p2pkh.invalid.checksum
        const result = decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })

      it('should decode a valid P2SH address', () => {
        const input = bitcoinAddresses.mainnet.p2sh.valid
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2sh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('mainnet')
      })

      it('should return invalid for a P2SH address with bad checksum', () => {
        const input = bitcoinAddresses.mainnet.p2sh.invalid.checksum
        const result = decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })

      it('should decode a valid P2TR address', () => {
        const input = bitcoinAddresses.mainnet.p2tr.valid
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2tr')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('mainnet')
      })

      it('should return invalid for a P2TR address with bad checksum', () => {
        const input = bitcoinAddresses.mainnet.p2tr.invalid.checksum
        const result = decode(input)

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
      it('should decode a valid P2PKH address', () => {
        const input = bitcoinAddresses.testnet.p2pkh.valid
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2pkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should return invalid for a P2PKH address with bad checksum', () => {
        const input = bitcoinAddresses.testnet.p2pkh.invalid.checksum
        const result = decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })

      it('should decode a valid P2SH address', () => {
        const input = bitcoinAddresses.testnet.p2sh.valid
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2sh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should return invalid for a P2SH address with bad checksum', () => {
        const input = bitcoinAddresses.testnet.p2sh.invalid.checksum
        const result = decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })

      it('should decode a valid P2WPKH address', () => {
        const input = bitcoinAddresses.testnet.p2wpkh.valid
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2wpkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should return invalid for a P2WPKH address with bad checksum', () => {
        const input = bitcoinAddresses.testnet.p2wpkh.invalid.checksum
        const result = decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })

      it('should decode a valid P2TR address', () => {
        const input = bitcoinAddresses.testnet.p2tr.valid
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2tr')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should return invalid for a P2TR address with bad checksum', () => {
        const input = bitcoinAddresses.testnet.p2tr.invalid.checksum
        const result = decode(input)

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
      it('should decode a valid P2PKH address (m prefix)', () => {
        const input = bitcoinAddresses.signet.p2pkh.valid.m
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2pkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should decode a valid P2PKH address (n prefix)', () => {
        const input = bitcoinAddresses.signet.p2pkh.valid.n
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2pkh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should return invalid for a P2PKH address with bad checksum', () => {
        const input = bitcoinAddresses.signet.p2pkh.invalid
        const result = decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })

      it('should decode a valid P2SH address', () => {
        const input = bitcoinAddresses.signet.p2sh.valid
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2sh')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should decode a valid P2TR address', () => {
        const input = bitcoinAddresses.signet.p2tr.valid
        const result = decode(input)

        expect(result.valid).toBe(true)
        if (!result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.destination.destination).toBe(input)
        expect(result.destination.type).toBe('bitcoin-address')
        expect(result.destination.addressType).toBe('p2tr')
        expect(result.destination.protocol).toBe('on-chain')
        expect(result.network).toBe('testnet')
      })

      it('should return invalid for a P2TR address with bad checksum', () => {
        const input = bitcoinAddresses.signet.p2tr.invalid
        const result = decode(input)

        expect(result.valid).toBe(false)
        if (result.valid) {
          return
        }
        expect(result.input).toBe(input)
        expect(result.errorCode).toBe('INVALID_CHECKSUM')
        expect(result.errorMessage).toBeDefined()
      })
    })

    it('should return invalid for a P2PKH address with wrong decoded length', () => {
      const input = bitcoinAddresses.mainnet.p2pkh.invalid.length
      const result = decode(input)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.errorCode).toBe('PAYLOAD_TOO_SHORT')
      expect(result.errorMessage).toBeDefined()
    })

    it('should return invalid for a P2WPKH address with wrong program length', () => {
      const input = bitcoinAddresses.mainnet.p2wpkh.invalid.programLength
      const result = decode(input)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.errorCode).toBe('PAYLOAD_TOO_SHORT')
      expect(result.errorMessage).toBeDefined()
    })

    it('should return invalid for a P2TR address with wrong program length', () => {
      const input = bitcoinAddresses.mainnet.p2tr.invalid.programLength
      const result = decode(input)

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
    it('should decode a testnet ark (bark) address', () => {
      const input = ArkAddresses.testnet.valid.bark
      const result = decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.destination).toBe(input)
      expect(result.destination.type).toBe('ark-address')
      expect(result.destination.protocol).toBe('ark')
      expect(result.network).toBe('testnet')
    })

    it('should decode a testnet ark (arkade) address', () => {
      const input = ArkAddresses.testnet.valid.arkade
      const result = decode(input)

      expect(result.valid).toBe(true)
      if (!result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.destination.destination).toBe(input)
      expect(result.destination.type).toBe('ark-address')
      expect(result.destination.protocol).toBe('ark')
      expect(result.network).toBe('testnet')
    })

    it('should return invalid for an ark address with bad checksum', () => {
      const input = ArkAddresses.testnet.invalid.checksum
      const result = decode(input)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.errorCode).toBe('INVALID_CHECKSUM')
      expect(result.errorMessage).toBeDefined()
    })

    it('should return invalid for an incomplete testnet ark address', () => {
      const input = ArkAddresses.testnet.invalid.incomplete
      const result = decode(input)

      expect(result.valid).toBe(false)
      if (result.valid) {
        return
      }
      expect(result.input).toBe(input)
      expect(result.errorCode).toBe('INVALID_CHECKSUM')
      expect(result.errorMessage).toBeDefined()
    })
  })
})
