# Project Commands

- Format: pnpm run format
- Format Check: pnpm run format:check
- Build: pnpm run build
- Test: pnpm run test
- Dev: pnpm run dev
- Preview: pnpm run preview
- Lint: pnpm run lint

# Project Overview

Ephereum Chat - a private, ephemeral messaging application on Ethereum using EIP-4844 blobs with ERC-5564 stealth addresses.

## Core Features

- Stealth addresses for recipient privacy
- E2E encryption (secp256k1 ECDH + XChaCha20-Poly1305)
- Ephemeral messages (blobs auto-pruned after ~18 days)
- Wallet-based key derivation with encrypted local storage
- Signing key for blob transactions (stealth-derived for privacy)
- Client-side only, no backend

# App Flow

```
Landing (/) → Onboarding (/onboarding) or Unlock → Chat (/chat) → Settings (/settings)
```

## Route Guards

- `/chat` requires `sessionReady` (keys unlocked)
- `/onboarding` redirects to `/chat` if `sessionReady`
- Landing page checks `sessionStatus` to show Unlock or navigate to Onboarding

## Session Status Flow

1. `checking` → Reading localStorage for existing keys
2. `locked` → Keys exist, need password to unlock
3. `unlocked` → Keys loaded, session ready

# Key Instructions

- **Minimize RPC calls** to avoid rate limiting (sequential tx fetching, shared hooks with caching)
- **Keys stored encrypted** in localStorage with AES-256-GCM + PBKDF2
- **Sync status** in sidebar footer, not header
- **Use env variable** for RPC endpoint

# Environment Variables

| Variable              | Description                     | Required |
| --------------------- | ------------------------------- | -------- |
| `VITE_PUBLIC_RPC_URL` | Ethereum RPC endpoint (Sepolia) | Yes      |

# Key Modules

| Module             | Purpose                                                           |
| ------------------ | ----------------------------------------------------------------- |
| `modules/stealth`  | Stealth address derivation, registry lookup, meta-address parsing |
| `modules/crypto`   | XChaCha20-Poly1305 encryption, HKDF key derivation                |
| `modules/blob`     | EIP-4844 blob construction and encoding                           |
| `modules/messages` | Payload encryption, metadata, TTL handling                        |
| `modules/keys`     | Key derivation from wallet signature, encrypted storage           |

# Utils Folder

Utility functions organized by domain:

```
utils/
├── index.ts         # Barrel exports
├── address.ts       # Address formatting, truncation
├── date.ts          # Date/time formatting, duration
├── explorer.ts      # Explorer URL helpers
├── hex.ts           # Hex/bytes conversions
└── transactions.ts  # Transaction fetching utilities
```

## Flow

```
1. User generates or imports stealth keys (view/spend)
2. During onboarding, optional signing key setup
3. Signing key derived independently (secp256k1 keypair)
4. Both keys encrypted together with user's password
5. To send: Use signing key to sign blob transaction
6. To receive: Scan with view key, decrypt with shared secret
```

# Architecture

See [docs/architecture.md](docs/architecture.md) for detailed implementation.
