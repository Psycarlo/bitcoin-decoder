![bitcoin-decoder](https://github.com/Psycarlo/bitcoin-decoder/blob/main/hero.png)

## Installation

```bash
npm install bitcoin-decoder
```

## Quick Start

```typescript
import { decode } from "bitcoin-decoder";

const result = decode("1111111111111111111114oLvT2");
```

## Privacy

Most decoders run fully offline, but transaction lookup (`opts.transaction.fetch`) and Nostr profile fetch (`opts.nostr.fetchProfile`) hit third-party servers by default (mempool.space and public relays).

Your IP and the queried txid/npub leak to whoever runs them. Pass `opts.transaction.endpoint` / `opts.nostr.relays` to point at your own infrastructure if that matters.

## Features

See [FEATURES.md](FEATURES.md) for the full list of supported formats.

## Contributing

Thinking of opening a pull request? See our [contribution guide](CONTRIBUTING.md) for dependencies, style guidelines, and code hygiene expectations.

## License

Released under the **MIT** license.
