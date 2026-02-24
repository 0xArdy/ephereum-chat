# Ephereum Chat

Private, ephemeral messaging on Ethereum using EIP-4844 blobs and ERC-5564 stealth addresses.

## Features

- **Stealth addresses** - Recipient privacy via one-time addresses
- **End-to-end encryption** - secp256k1 ECDH + XChaCha20-Poly1305
- **Ephemeral messages** - Blobs auto-pruned after ~18 days
- **Wallet-based key derivation** - Deterministic keys from signature (Optional)
- **Stealth-derived signing key** - Privacy-preserving key for signing blob transactions
- **Encrypted local storage** - AES-256-GCM + PBKDF2 password protection
- **Client-side only** - No backend, no server storage

## Why a Signing Key?

Browser wallets (MetaMask, Rabby, etc.) **cannot sign EIP-4844 blob transactions** - this is a protocol limitation. Ephereum Chat uses a separate signing key that:

- Is **derived from your stealth meta-address** for privacy (cannot be linked to your main wallet)
- Can be **funded anonymously** via [privacypools.com](https://privacypools.com)
- Is **encrypted and stored locally** with your other keys
- Handles all blob transaction signing

Your main wallet is still used for:

- Registry interactions (registering your stealth address)
- General Ethereum transactions
- Signing the initial key derivation message

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/ephereum-chat.git
cd ephereum-chat
pnpm install

# Configure environment
cp .env.example .env

# Run development server
pnpm run dev
```

Open http://localhost:5173, connect your wallet, and follow the onboarding flow.

## App Flow

```
Landing → Onboarding (derive keys) → Setup Signing Key → Set Password → Chat
```

Returning users see an Unlock screen instead of onboarding.

### During Onboarding

1. **Generate Signing Key** - Create a stealth-derived key for blob transactions
2. **Fund Signing Key** - Send Sepolia ETH to your signing address for gas fees
3. **Set Password** - Encrypt all keys locally with AES-256-GCM

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed implementation.

## Smart Contracts (Sepolia)

| Contract                            | Address                                      |
| ----------------------------------- | -------------------------------------------- |
| ERC-6538 Registry                   | `0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538` |
| MessageEnvelopeRegistry (announcer) | `0xe42A8d79AE1e4bbA02F753c592C43941f442c9A7` |

## Development

| Command           | Description              |
| ----------------- | ------------------------ |
| `pnpm run dev`    | Start development server |
| `pnpm run build`  | Build for production     |
| `pnpm run test`   | Run tests                |
| `pnpm run lint`   | Lint code                |
| `pnpm run format` | Format code              |

## Deployment (Vercel)

This repository includes a production-ready `vercel.json` for:

- Static build output from `apps/web/dist`
- SPA route fallback for `/chat`, `/settings`, and other client routes
- Proxy rewrite for `/blobscan-storage/*`
- Security headers including CSP

### Required Environment Variables

Set this in your Vercel project settings:

- `VITE_PUBLIC_RPC_URL` - Sepolia RPC endpoint used by the client

### Deploy

```bash
vercel
```

## Documentation

- [Architecture](docs/architecture.md) - Implementation details
- [Deployment Guide](docs/deployment.md) - Vercel deployment and verification
- [User Guide](docs/user-guide.md) - How to use the app

## License

AGPL-3.0
