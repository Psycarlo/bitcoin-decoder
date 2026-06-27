import { ripemd160 } from '@noble/hashes/legacy.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { createBase58check, hex } from '@scure/base'
import type {
  ExtendedKey,
  ExtendedKeyScriptType,
  ExtendedKeyType,
  Input,
  Network
} from '../types'
import { DecodeError } from '../types'

const b58c = createBase58check(sha256)

const EXTENDED_KEY_LENGTH = 78
const HARDENED_OFFSET = 0x80_00_00_00
const COMPRESSED_PUBKEY_PREFIXES = new Set([0x02, 0x03])
const FINGERPRINT_BYTES = 4

type VersionInfo = {
  type: ExtendedKeyType
  isPrivate: boolean
  network: Network
  scriptType: ExtendedKeyScriptType
}

/** SLIP-132 version bytes → key metadata. */
const VERSIONS: Record<number, VersionInfo> = {
  76067358: {
    type: 'xpub',
    isPrivate: false,
    network: 'mainnet',
    scriptType: 'p2pkh'
  },
  76066276: {
    type: 'xprv',
    isPrivate: true,
    network: 'mainnet',
    scriptType: 'p2pkh'
  },
  77429938: {
    type: 'ypub',
    isPrivate: false,
    network: 'mainnet',
    scriptType: 'p2wpkh-p2sh'
  },
  77428856: {
    type: 'yprv',
    isPrivate: true,
    network: 'mainnet',
    scriptType: 'p2wpkh-p2sh'
  },
  78792518: {
    type: 'zpub',
    isPrivate: false,
    network: 'mainnet',
    scriptType: 'p2wpkh'
  },
  78791436: {
    type: 'zprv',
    isPrivate: true,
    network: 'mainnet',
    scriptType: 'p2wpkh'
  },
  43365439: {
    type: 'Ypub',
    isPrivate: false,
    network: 'mainnet',
    scriptType: 'p2wsh-p2sh'
  },
  43364357: {
    type: 'Yprv',
    isPrivate: true,
    network: 'mainnet',
    scriptType: 'p2wsh-p2sh'
  },
  44728019: {
    type: 'Zpub',
    isPrivate: false,
    network: 'mainnet',
    scriptType: 'p2wsh'
  },
  44726937: {
    type: 'Zprv',
    isPrivate: true,
    network: 'mainnet',
    scriptType: 'p2wsh'
  },
  70617039: {
    type: 'tpub',
    isPrivate: false,
    network: 'testnet',
    scriptType: 'p2pkh'
  },
  70615956: {
    type: 'tprv',
    isPrivate: true,
    network: 'testnet',
    scriptType: 'p2pkh'
  },
  71979618: {
    type: 'upub',
    isPrivate: false,
    network: 'testnet',
    scriptType: 'p2wpkh-p2sh'
  },
  71978536: {
    type: 'uprv',
    isPrivate: true,
    network: 'testnet',
    scriptType: 'p2wpkh-p2sh'
  },
  73342198: {
    type: 'vpub',
    isPrivate: false,
    network: 'testnet',
    scriptType: 'p2wpkh'
  },
  73341116: {
    type: 'vprv',
    isPrivate: true,
    network: 'testnet',
    scriptType: 'p2wpkh'
  },
  37915119: {
    type: 'Upub',
    isPrivate: false,
    network: 'testnet',
    scriptType: 'p2wsh-p2sh'
  },
  37914037: {
    type: 'Uprv',
    isPrivate: true,
    network: 'testnet',
    scriptType: 'p2wsh-p2sh'
  },
  39277699: {
    type: 'Vpub',
    isPrivate: false,
    network: 'testnet',
    scriptType: 'p2wsh'
  },
  39276616: {
    type: 'Vprv',
    isPrivate: true,
    network: 'testnet',
    scriptType: 'p2wsh'
  }
}

const EXTENDED_KEY_PREFIXES = [
  ...new Set(Object.values(VERSIONS).map((v) => v.type))
]

function isExtendedKey(input: Input): boolean {
  return EXTENDED_KEY_PREFIXES.some((prefix) => input.startsWith(prefix))
}

function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data))
}

function extendedKey(input: Input): ExtendedKey {
  let payload: Uint8Array
  try {
    payload = b58c.decode(input)
  } catch {
    throw new DecodeError(
      'Invalid extended key base58check checksum',
      'INVALID_EXTENDED_KEY'
    )
  }

  if (payload.length !== EXTENDED_KEY_LENGTH) {
    throw new DecodeError(
      `Invalid extended key length: ${payload.length}`,
      'INVALID_EXTENDED_KEY'
    )
  }

  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength
  )
  const version = view.getUint32(0, false)
  const info = VERSIONS[version]
  if (!info) {
    throw new DecodeError(
      `Unknown extended key version: 0x${version.toString(16)}`,
      'INVALID_EXTENDED_KEY'
    )
  }

  const depth = payload[4] as number
  const parentFingerprint = hex.encode(payload.slice(5, 9))
  const childNumber = view.getUint32(9, false)
  const chainCode = hex.encode(payload.slice(13, 45))
  const keyBytes = payload.slice(45, 78)
  const key = hex.encode(keyBytes)

  let fingerprint: string | undefined
  if (
    !info.isPrivate &&
    COMPRESSED_PUBKEY_PREFIXES.has(keyBytes[0] as number)
  ) {
    fingerprint = hex.encode(hash160(keyBytes).slice(0, FINGERPRINT_BYTES))
  }

  return {
    type: info.type,
    isPrivate: info.isPrivate,
    network: info.network,
    scriptType: info.scriptType,
    depth,
    parentFingerprint,
    childNumber,
    index: childNumber % HARDENED_OFFSET,
    hardened: childNumber >= HARDENED_OFFSET,
    chainCode,
    key,
    fingerprint
  }
}

export { extendedKey, isExtendedKey, EXTENDED_KEY_PREFIXES }
