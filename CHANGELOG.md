# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-05-21

### Added

- Add support for bitcoin transaction decoding

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
