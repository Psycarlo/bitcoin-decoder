export const bitcoinAddresses = {
  mainnet: {
    p2pkh: {
      valid: '1111111111111111111114oLvT2',
      invalid: {
        checksum: '1111111111111111111114oLvT0',
        length: '111111111116xtCH8'
      }
    },
    p2sh: {
      valid: '31h1vYVSYuKP6AhS86fbRdMw9XHieotbST',
      invalid: {
        checksum: '31h1vYVSYuKP6AhS86fbRdMw9XHieotbSo'
      }
    },
    p2wpkh: {
      valid: '',
      invalid: {
        programLength: 'bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqv8de0q'
      }
    },
    p2wsh: {
      valid: 'bc10qyp40l5u7z6zvx055lnyxrqnl3wkwcpjpdtsmkx9mq',
      invalid: {
        checksum: 'bc10qyp40l5u7z6zvx055lnyxrqnl3wkwcpjpdtsmkx9mb'
      }
    },
    p2tr: {
      valid: 'bc1p00000000xxxhdqfw0zgkc0h00u9702naqf3k98kw554epmmkannqlvr5n0',
      invalid: {
        checksum:
          'bc1p00000000xxxhdqfw0zgkc0h00u9702naqf3k98kw554epmmkannqlvr5n1',
        programLength: 'bc1pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmmente'
      }
    }
  },
  testnet: {
    p2pkh: {
      valid: 'mfWxJ45yp2SFn7UciZyNpvDKrzbhyfKrY8',
      invalid: {
        checksum: 'mfWxJ45yp2SFn7UciZyNpvDKrzbhyfKrY7'
      }
    },
    p2sh: {
      valid: '2MsFDzHRUAMpjHxKyoEHU3aMCMsVtMqs1PV',
      invalid: {
        checksum: '2MsFDzHRUAMpjHxKyoEHU3aMCMsVtMqs1PT'
      }
    },
    p2wpkh: {
      valid: 'tb1qur637t05mfk6483kpxtvqufxdz54mg0et6hs8n',
      invalid: {
        checksum: 'tb1qur637t05mfk6483kpxtvqufxdz54mg0et6hs8d'
      }
    },
    p2wsh: {},
    p2tr: {
      valid: 'tb1p0000ctmd96wsfakv098sxm9vmm9nu4zjadw8fw84j3zt8fa0kmzqpyqkc8',
      invalid: {
        checksum:
          'tb1p0000ctmd96wsfakv098sxm9vmm9nu4zjadw8fw84j3zt8fa0kmzqpyqkc7'
      }
    }
  },
  signet: {
    p2pkh: {
      valid: {
        m: 'mfWxJ45yp2SFn7UciZyNpvDKrzbhyfKrY8',
        n: 'n1112uCfL9kZTLSPCFUPb2n6rcM2bH5fgp'
      },
      invalid: 'mfWxJ45yp2SFn7UciZyNpvDKrzbhyfKrY7'
    },
    p2sh: {
      valid: '2MsFGdp8z5FD49fDu8teN12xMgr9697A62w',
      invalid: '2MsFGdp8z5FD49fDu8teN12xMgr9697A62f'
    },
    p2wpkh: {},
    p2wsh: {},
    p2tr: {
      valid: 'tb1p000020hlv9gcu70xuzzp0umrapl25489x5c4kyja6jznypanjyhqgz3rzw',
      invalid: 'tb1p000020hlv9gcu70xuzzp0umrapl25489x5c4kyja6jznypanjyhqgz3rzz'
    }
  },
  regtest: {
    p2pkh: {},
    p2sh: {},
    p2wpkh: {},
    p2wsh: {},
    p2tr: {}
  }
}
