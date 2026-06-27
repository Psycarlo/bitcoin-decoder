# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Bech32-encoded destination values return lowercase in `destination.value` and `encoded` (NIP-19). Lightning addresses are lowercased. Legacy base58 and extended keys preserve input casing. Transaction ids and tx hex fields use lowercase.

## [0.7.0] - 2026-06-27

### Added

- Extended key decoding (BIP-32 / SLIP-132) for `xpub`/`xprv`, `ypub`/`yprv`, `zpub`/`zprv`, `Ypub`/`Yprv`, `Zpub`/`Zprv`, and their testnet variants (`tpub`, `upub`, `vpub`, `Upub`, `Vpub`), returned as `DecodedKey { kind: 'key', key: ExtendedKey }`. Offline base58check parsing, no network calls.
- PSBT decoding (BIP-174 v0 and BIP-370 v2) from base64 or hex, returned as `DecodedPsbt { kind: 'psbt', data: PsbtData }`. Surfaces inputs, outputs, totals, and fee (when every input exposes its UTXO). Offline, no network calls.
- `DecodeOptions` accepts new optional `psbt: { network }` field (default `mainnet`).
- Error codes `INVALID_EXTENDED_KEY` and `INVALID_PSBT`.
- Public exports: `DecodedKey`, `DecodedPsbt`, `ExtendedKey`, `ExtendedKeyType`, `ExtendedKeyScriptType`, `PsbtData`, `PsbtInput`, `PsbtOutput`, `PsbtDecodeOptions`.
- `test:coverage` script and `bip-32`, `slip-132`, `xpub`, `psbt`, `bip-174` package keywords.

### Changed

- **Breaking:** `Destination.destination` field renamed to `value`.
- **Breaking:** `wellKnown()` now returns `null` instead of `false` on failure.
- **Breaking:** removed the `Input` type alias; public types now use `string` directly.
- **Breaking:** removed the default export; import the named `decode` export instead (`import { decode } from 'bitcoin-decoder'`).

## [0.6.2] - 2026-06-23

### Fixed

- Multi-rail BIP-321 URIs no longer rejected when one rail is invalid; only valid rails are kept.
- Ark decode errors now report the real cause instead of always `Invalid bech32m checksum`.

## [0.6.1] - 2026-05-26

### Fixed

- BIP-321 URI-level metadata (`amount`, `label`, `message`) now propagates to every payment rail, not only on-chain.

## [0.6.0] - 2026-05-21

### Added

- Add support for bitcoin transaction decoding.

### Changed

- `DecodeOptions` accepts new optional `transaction` field (backwards compatible).
- `DecodedData` union now includes `DecodedTransaction`.
- CI publish workflow upgraded to Node 24 with npm Trusted Publishing and release attestation; tarball path prefixed with `./`.

## [0.5.0] - 2026-05-21

### Added

- Nostr NIP-19 decoding for `npub`, `nsec`, `note`, `nprofile`, `nevent`, `naddr` inputs, returned as `DecodedNostr { kind: 'nostr', entity }`.
- Optional kind-0 profile fetch over relays via `decode(input, { nostr: { fetchProfile: true } })`; results attached as `ProfileFetchResult` on `npub` and `nprofile` entities.
- `DecodeOptions` parameter on `decode()` with `nostr: { fetchProfile, relays, timeout, verify }`.
- Public exports: `NOSTR_RELAYS`, `DEFAULT_NOSTR_RELAYS`, `NostrRelayUrl`, `DecodedNostr`, `DecodedPayment`, `DecodeOptions`, `NostrDecodeOptions`, `NostrEntity`, `NostrProfile`, `ProfileFetchResult`.
- `INVALID_NIP19` error code.
- `nostr-tools ^2.23.5` runtime dependency.
- `engines.node >= 22` constraint.

### Changed

- `decode()` signature now accepts an optional second `DecodeOptions` argument (backwards compatible: defaults to `{}`).
