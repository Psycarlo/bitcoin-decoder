import { ArkAddresses } from './ark'
import { lightningAddresses } from './lightning-address'

export const bip321URIs = {
  lightningAddressWithArk: `bitcoin:?lightning=${lightningAddresses.valid.medusa}&ark=${ArkAddresses.testnet.valid.arkade}`
}
