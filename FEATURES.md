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

## Metadata

- [x] Amount in sats (BOLT11, BIP-321)
- [x] Description / label / message (BOLT11, BOLT12, BIP-321)
