# Features

What `bitcoin-decoder` can currently decode.

## On-chain

- [x] P2PKH addresses (legacy, `1...` / `m...` / `n...`)
- [x] P2SH addresses (`3...` / `2...`)
- [x] P2WPKH addresses (bech32, `bc1q...` / `tb1q...` / `bcrt1q...`)
- [x] P2WSH addresses (bech32, 32-byte witness program)
- [x] P2TR addresses (bech32m, witness v1)
- [x] Future witness versions v2–v16 (bech32m, 2–40 byte program)

## Lightning

- [x] BOLT11 invoices (`lnbc`, `lntb`, `lntbs`, `lnbcrt`)
- [x] `lightning:` URI prefix
- [x] BOLT12 offers (`lno1`, `lnbcrto1`, `lnto1`)
- [x] BOLT12 offers without checksum (e.g. Phoenix wallet)
- [x] LNURL (bech32-encoded, endpoint reachability check)
- [x] Lightning addresses (`user@domain`, LNURL-pay well-known lookup)

## Ark

- [x] Ark addresses (`ark1...` mainnet, `tark1...` testnet, versions 0 and 1)

## Unified URIs

- [x] BIP-321 `bitcoin:` URIs with multiple payment methods
- [x] BIP-321 payment method priority: Lightning > Ark > On-chain
- [x] BIP-321 lightning param as BOLT11 or Lightning address
- [x] BIP-321 offer (BOLT12) param
- [x] BIP-321 Ark param
- [x] BIP-321 amount param and other metadata

## Network detection

- [x] Mainnet (`bc1`, `1`, `3`, `lnbc`, `lno1`, `ark1`)
- [x] Testnet (`tb1`, `m`, `n`, `2`, `lntb`, `tark1`)
- [x] Signet (`tb1` addresses, `lntbs` invoices)
- [x] Regtest (`bcrt1`, `lnbcrt`, `lnbcrto1`, `lnto1`)
- [x] Detection across on-chain, BOLT11, BOLT12, and Ark prefixes

Note: `Network` type collapses signet and regtest into `testnet`.

## Nostr

- [x] NIP-19 `npub` (public key)
- [x] NIP-19 `nsec` (secret key)
- [x] NIP-19 `note` (event id)
- [x] NIP-19 `nprofile` (pubkey + relay hints)
- [x] NIP-19 `nevent` (event id + relay hints, optional author and kind)
- [x] NIP-19 `naddr` (parameterized replaceable event coordinate)
- [x] Optional kind-0 profile fetch over relays for `npub` and `nprofile` (`decode(input, { nostr: { fetchProfile: true } })`)
- [x] Configurable relays, timeout, and schnorr signature verification via `NostrDecodeOptions`
- [x] Default public relay set exported as `DEFAULT_NOSTR_RELAYS` / `NOSTR_RELAYS`

## Transactions

- [x] Bitcoin transaction id (64-char hex) — offline validation + lowercase normalization
- [x] Optional full transaction lookup via esplora-compatible HTTP endpoint (`decode(txid, { transaction: { fetch: true } })`)
- [x] Networks: mainnet, testnet (testnet4), signet, regtest (regtest requires explicit `endpoint`)
- [x] Default endpoints to mempool.space; configurable via `endpoint` (esplora, blockstream.info, self-hosted, Tor)
- [x] Fields: confirmation status, block height/hash/time, fee (sats), fee rate (sat/vB), size, vsize, weight, version, locktime, totalInput, totalOutput
- [x] Inputs: prevout txid+vout, prevout value/address/scriptPubKeyType, sequence, witness, coinbase detection
- [x] Outputs: value (sats), address, addressType, scriptPubKeyType (`p2pk`, `p2pkh`, `p2sh`, `v0_p2wpkh`, `v0_p2wsh`, `v1_p2tr`, `op_return`, `multisig`, `unknown`)
- [x] Optional miner pool name via mempool.space `/v1/block` extras (`fetchMiner: true`)
- [x] Errors: `INVALID_TXID`, `TX_NOT_FOUND`, `TX_FETCH_ERROR`, `TX_TIMEOUT`

## Metadata

- [x] Amount in sats (BOLT11, BIP-321)
- [x] Description / label / message (BOLT11, BOLT12, BIP-321)
- [x] Nostr profile metadata (name, displayName, about, picture, banner, nip05, lud06, lud16, website, bot)
- [x] Transaction fee, fee rate, totals, inputs/outputs (see Transactions)
