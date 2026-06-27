/**
 * PSBT test vectors.
 *  - `creator`: verbatim BIP-174 creator-stage PSBT (1 input, 2 outputs, no UTXO data).
 *  - `withWitnessUtxo`: locally built v0 PSBT (1 input, 1 output) carrying a
 *    witness UTXO, so input value and fee are derivable.
 */
export const psbts = {
  creator: {
    valid:
      'cHNidP8BAHUCAAAAASaBcTce3/KF6Tet7qSze3gADAVmy7OtZGQXE8pCFxv2AAAAAAD+////AtPf9QUAAAAAGXapFNDFmQPFusKGh2DpD9UhpGZap2UgiKwA4fUFAAAAABepFDVF5uM7gyxHBQ8k0+65PJwDlIvHh7MuETAAAAAAAAA=',
    version: 0,
    txVersion: 2,
    locktime: 806_432_435,
    inputCount: 1,
    outputCount: 2,
    totalOutput: 199_999_699,
    outputs: [
      { value: 99_999_699, address: '1L2tGENeoh4mSoiUZrSbs1J3jazSdJH9QS' },
      { value: 100_000_000, address: '36YhUacEtcnkfhSbxwm11wDCexLGBLgJF6' }
    ]
  },
  withWitnessUtxo: {
    valid:
      'cHNidP8BAFICAAAAARERERERERERERERERERERERERERERERERERERERERERAAAAAAD/////AZBfAQAAAAAAFgAUIiIiIiIiIiIiIiIiIiIiIiIiIiIAAAAAAAEBH6CGAQAAAAAAFgAUIiIiIiIiIiIiIiIiIiIiIiIiIiIAAA==',
    version: 0,
    inputCount: 1,
    outputCount: 1,
    inputValue: 100_000,
    totalInput: 100_000,
    totalOutput: 90_000,
    fee: 10_000
  },
  invalid: 'cHNidP8AAAAA',
  notPsbt: 'this is not a psbt'
} as const
