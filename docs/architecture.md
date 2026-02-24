# Architecture

## App Structure

```
apps/web/src/
├── pages/
│   ├── landing/LandingPage.tsx      # Entry point, "Enter App" button
│   ├── onboarding/OnboardingPage.tsx # Key setup (wallet optional) → Password
│   ├── unlock/UnlockPage.tsx        # Password prompt for returning users
│   ├── chat/ChatPage.tsx            # Main messaging interface
│   └── settings/SettingsPage.tsx    # Keys, Registry, Advanced settings
├── state/
│   ├── session-context.tsx          # View/spend keys, lock/unlock, session status
│   └── router-context.tsx           # Client-side routing
├── hooks/
│   ├── useChatSync.ts               # Message sync with 60s polling
│   └── useRegistry.ts               # Shared registry lookups (cached)
└── modules/
    ├── stealth/                     # Stealth address derivation, registry
    ├── crypto/                      # Encryption, HKDF
    ├── blob/                        # EIP-4844 blob construction
    ├── messages/                    # Payload encryption + metadata encoding
    └── keys/                        # Key derivation, encrypted storage
```

## Routes and Guards

| Route         | Guard                                 | Description                       |
| ------------- | ------------------------------------- | --------------------------------- |
| `/`           | None                                  | Landing page with "Enter App"     |
| `/onboarding` | Redirects if `sessionReady`           | Setup keys for new users          |
| `/unlock`     | Shown if `sessionStatus === 'locked'` | Password prompt                   |
| `/chat`       | Requires `sessionReady`               | Main messaging interface          |
| `/settings`   | None                                  | Keys, Registry, Advanced settings |

## Wallet Dependency Matrix

| Area                | Wallet Required | Why                                                                                      |
| ------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| Onboarding          | Optional        | Only needed for deterministic `derive from wallet`; generate/import works without wallet |
| Chat send/receive   | No              | Uses local stealth/signing keys + RPC reads/writes                                       |
| Settings → Keys     | Optional        | Wallet only needed for deterministic derivation path                                     |
| Settings → Registry | Yes (for write) | Registering meta-address is an on-chain wallet transaction                               |

## Session Management

### Session Status Flow

```
checking → locked → unlocked
           ↓
      (no stored keys)
           ↓
         unlocked (empty)
```

1. **checking** - App reads localStorage for existing encrypted keys
2. **locked** - Keys exist, user must enter password to unlock
3. **unlocked** - Keys loaded into session, ready to use

### Key Storage

Keys are stored in localStorage encrypted with AES-256-GCM:

```typescript
interface KeyBundle {
  viewPrivKey: string;
  spendPrivKey: string;
  createdAt: number;
  derivationMethod: "signature" | "imported" | "generated";
  signingPrivKey?: string; // Optional signing key for blob transactions
}
```

Encryption: AES-256-GCM with PBKDF2 key derivation (100,000 iterations)

## Key Derivation Methods

### 1. Wallet Signature (Optional)

```typescript
const signature = await signMessageAsync({ message: SIGNATURE_MESSAGE });
const keys = deriveKeysFromSignature(signature);
// Uses HKDF-SHA256 to derive view and spend keys from signature
```

### 2. Import Existing

User pastes existing private keys directly.

### 3. Generate New

Random key generation using `@noble/secp256k1`.

## Signing Key Architecture

### Why a Separate Signing Key?

Browser wallets (MetaMask, Rabby, etc.) **cannot sign EIP-4844 blob transactions**. This is a protocol limitation - blobs require special handling that browser extension wallets don't support.

**Solution:** A separate secp256k1 keypair stored encrypted alongside stealth keys.

### Privacy-First Design

The signing key is a **dedicated secp256k1 keypair** used only for blob transactions:

1. **Same privacy properties** as recipient stealth addresses
2. **Cannot be linked** to the main wallet without the view key
3. Can be **funded anonymously** via [privacypools.com](https://privacypools.com)

### Key Types Summary

| Key Type        | Purpose                        | Storage                        |
| --------------- | ------------------------------ | ------------------------------ |
| View Key        | Scan announcements, decrypt    | Encrypted in localStorage      |
| Spend Key       | Stealth address ownership      | Encrypted in localStorage      |
| **Signing Key** | Sign blob transactions         | Encrypted in localStorage      |
| Wallet Key      | Optional registry + derivation | Browser wallet (MetaMask, etc) |

### Signing Key Flow

```
Onboarding:
  1. User generates/imports stealth keys (view + spend)
  2. Optional: Generate signing key (secp256k1 keypair)
  3. Signing key encrypted with user's password
  4. Stored in localStorage alongside stealth keys

Sending Messages:
  1. User composes message with recipient
  2. App checks signing key balance (needs ETH for gas)
  3. App constructs blob transaction with encrypted payload
  4. Signing key signs the transaction
  5. Transaction submitted to network

Privacy:
  - Signing address is isolated from the user's main wallet
  - Fund via privacypools.com for stronger unlinkability
  - Main wallet is optional (registry + deterministic derivation only)
```

## Message Flow

### Sending

```
1. Resolve recipient meta-address (registry lookup or direct input)
2. Generate ephemeral keypair
3. Derive stealth address for recipient
4. Encrypt message with ECDH + XChaCha20-Poly1305
5. Build EIP-4844 blob with encrypted payload
6. Sign with signing key (browser wallet can't sign blobs)
7. Submit transaction to Announcer contract
```

### Receiving

```
1. Poll for announcement events (60s interval)
2. Filter by view tag (fast pre-filter)
3. Attempt to recover stealth address with local keys
4. If match, fetch blob and decrypt
5. Display in inbox
```

### On-Chain Metadata Model

Announcement metadata is intentionally minimal:

```json
{
  "version": "v1",
  "payloadHash": "0x..."
}
```

Thread labels and message text are inside the encrypted blob payload. They are
not stored as plaintext metadata in the event.

## Encryption Details

| Component            | Algorithm            | Key Size            |
| -------------------- | -------------------- | ------------------- |
| Key agreement        | secp256k1 ECDH       | 256 bits            |
| Key derivation       | HKDF-SHA256          | 256 bits            |
| Symmetric encryption | XChaCha20-Poly1305   | 256 bits            |
| Nonce                | Random               | 192 bits (24 bytes) |
| Key storage          | AES-256-GCM + PBKDF2 | 256 bits            |

## Blob Structure

```
EIP-4844 Blob (131,072 bytes)
└── Encrypted Payload
    ├── Nonce (24 bytes)
    ├── Ciphertext (variable)
    └── Auth Tag (16 bytes)
```
