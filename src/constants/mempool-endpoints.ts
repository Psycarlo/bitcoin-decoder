import type { TransactionNetwork } from '../types'

/** Default mempool.space REST API endpoints by network.
 *
 *  `testnet` resolves to testnet4. `regtest` has no public endpoint
 *  and must be supplied via `opts.transaction.endpoint`.
 */
export const MEMPOOL_ENDPOINTS: Record<
  Exclude<TransactionNetwork, 'regtest'>,
  string
> = {
  mainnet: 'https://mempool.space/api',
  testnet: 'https://mempool.space/testnet4/api',
  signet: 'https://mempool.space/signet/api'
}
