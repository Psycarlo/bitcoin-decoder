/**
 * BIP-32 / SLIP-132 extended key test vectors.
 *
 * `zpub` is the real BIP-84 account-level test vector. The remaining strings
 * reuse a valid key body re-serialized under each SLIP-132 version prefix, so
 * they exercise every version-byte branch with correct base58check checksums.
 */
export const extendedKeys = {
  zpub: {
    valid:
      'zpub6jftahH18ngZxLmXaKw3GSZzZsszmt9WqedkyZdezFtWRFBZqsQH5hyUmb4pCEeZGmVfQuP5bedXTB8is6fTv19U1GQRyQUKQGUTzyHACMF',
    type: 'zpub',
    isPrivate: false,
    network: 'mainnet',
    scriptType: 'p2wpkh',
    depth: 0,
    parentFingerprint: '00000000',
    childNumber: 0,
    chainCode:
      '7923408dadd3c7b56eed15567707ae5e5dca089de972e07f3b860450e2a3b70e',
    key: '03d902f35f560e0470c63313c7369168d9d7df2d49bf295fd9fb7cb109ccee0494',
    fingerprint: '73c5da0a'
  },
  xpub: {
    valid:
      'xpub661MyMwAqRbcFkPHucMnrGNzDwb6teAX1RbKQmqtEF8kK3Z7LZ59qafCjB9eCRLiTVG3uxBxgKvRgbubRhqSKXnGGb1aoaqLrpMBDrVxga8',
    type: 'xpub',
    scriptType: 'p2pkh',
    network: 'mainnet',
    isPrivate: false
  },
  xprv: {
    valid:
      'xprv9s21ZrQH143K3GJpoapnV8SFfukcVBSfeCficPSGfubmSFDxo1kuHnListB8aYr2VUnNc3KvHqJyDCZUnhVjcZfUPfUtDoxbwzSmytrrDPm',
    type: 'xprv',
    scriptType: 'p2pkh',
    network: 'mainnet',
    isPrivate: true
  },
  ypub: {
    valid:
      'ypub6QqdH2c5z79673aQjy9R4MUVPujYqGA1vY7YCAjmcFWdN9NLbDEiTeKLkP7ECKzds8NrfRnX8zGyZtXA9QFT7mTs8vi1PVeq8YQpcNKUMvQ',
    type: 'ypub',
    scriptType: 'p2wpkh-p2sh',
    network: 'mainnet',
    isPrivate: false
  },
  zprv: {
    valid:
      'zprvAWgYBBk7JR8Gjrh4UJQ2uJdG1r3WNRRfURiABBE3RvMXYSrRJL62XuezvJ6JaN9sJm1z6zX3DA24ymncE6KmD32g8LsjPdbaVSa4m4155rp',
    type: 'zprv',
    scriptType: 'p2wpkh',
    network: 'mainnet',
    isPrivate: true
  },
  Zpub: {
    valid:
      'Zpub6vZyhw1ShkEwNuvuWzQ26WuoHfvFzEq79vHRtpuCN2iv3RkUcGnZApqQaJ2HkfsTWEZeHVPCUs22aLkVAKpR4VG8qjWqNowKHzkLavKB4Ep',
    type: 'Zpub',
    scriptType: 'p2wsh',
    network: 'mainnet',
    isPrivate: false
  },
  tpub: {
    valid:
      'tpubD6NzVbkrYhZ4XYa9MoLt4BiMZ4gkt2faZ4BcmKu2a9te4LDpQmvEz2L2yDERivHxFPnxXXhqDRkUNnQCpZggCyEZLBktV7VaSmwayqMJy1s',
    type: 'tpub',
    scriptType: 'p2pkh',
    network: 'testnet',
    isPrivate: false
  },
  vpub: {
    valid:
      'vpub5SLqN2bLY4WeZA14EtnYS6Byt1JD1QBXBCYsqz47UENzCqveqEk2bTLvgmEUCc2seD2SQzzqm1DKv2gTzK1Qj4R4XucjdmCNKNDtSgckK7x',
    type: 'vpub',
    scriptType: 'p2wpkh',
    network: 'testnet',
    isPrivate: false
  },
  Uprv: {
    valid:
      'Uprv95RJn67y7xyEuwtrFAvtgwVYsoMXsg9mD8kjBU29ufJXu8MBoSeVWiEEcyFr9G7AW2VwECYMo4dpgWLYvqQeNLjLd7W1sUy92YXiQ4rH9C6',
    type: 'Uprv',
    scriptType: 'p2wsh-p2sh',
    network: 'testnet',
    isPrivate: true
  },
  invalidChecksum:
    'xpub661MyMwAqRbcFkPHucMnrGNzDwb6teAX1RbKQmqtEF8kK3Z7LZ59qafCjB9eCRLiTVG3uxBxgKvRgbubRhqSKXnGGb1aoaqLrpMBDrVxg00'
} as const
