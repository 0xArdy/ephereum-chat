# Ephereum Chat User Guide

A guide to using Ephereum Chat for private, ephemeral messaging on Ethereum.

## Overview

Ephereum Chat provides:

- **Stealth addresses** for recipient privacy
- **End-to-end encryption** using secp256k1 ECDH + XChaCha20-Poly1305
- **Ephemeral messages** stored in EIP-4844 blobs (auto-pruned after ~18 days)
- **Dedicated signing key** for private blob transaction signing
- **No backend** - everything runs client-side

---

## Getting Started

### Prerequisites

1. Sepolia ETH for signing-key gas fees (~0.01 ETH for testing)
2. Optional wallet (MetaMask, Rabby, etc.) if you want deterministic key derivation or registry registration

---

### Step 1: Open the App

1. Open the app and click **Enter App**
2. Go to onboarding and choose how to set up stealth keys

---

### Step 2: Setup Your Keys

Choose how to generate your stealth address keys:

| Method                 | Description                                   | Best For               |
| ---------------------- | --------------------------------------------- | ---------------------- |
| **Derive from Wallet** | Sign a message to generate deterministic keys | Deterministic recovery |
| **Generate New Keys**  | Create random keys you must back up           | Advanced users         |
| **Import Existing**    | Paste your existing private keys              | Restoring from backup  |

**Derive from Wallet (Optional):**

1. Click "Derive from Wallet"
2. Sign the message in your wallet
3. Keys are deterministically derived from your signature

This method is convenient: the same wallet signature path generates the same keys.

---

### Step 3: Set Encryption Password

Your keys are encrypted locally with a password you choose:

1. Enter a password (8+ characters)
2. Confirm the password
3. Click **Save Keys**

**Important:** This password encrypts your keys in localStorage. If you forget it, you'll need to re-derive or re-import your keys.

---

### Step 4: Setup Signing Key (Required to Send)

To send messages, you need a **signing key** because browser wallets cannot sign EIP-4844 blob transactions.

#### What is the Signing Key?

| Feature     | Description                                                     |
| ----------- | --------------------------------------------------------------- |
| **Purpose** | Sign blob transactions (your wallet can't do this)              |
| **Privacy** | Separate messaging-only address, isolated from your main wallet |
| **Funding** | Needs Sepolia ETH for gas fees                                  |
| **Storage** | Encrypted locally with your other keys                          |

#### Why This Matters for Privacy

Your signing key is a dedicated onchain address used only for messaging:

- It is isolated from your main wallet activity
- You can fund it anonymously via [privacypools.com](https://privacypools.com)
- Third parties cannot trace messages back to your identity

#### Setting Up Your Signing Key

1. During onboarding, you'll see the "Setup Signing Key" step
2. Click **Generate Signing Key**
3. Copy the displayed address
4. Fund it with Sepolia ETH:
   - From your main wallet, OR
   - Anonymously via [privacypools.com](https://privacypools.com) (recommended for privacy)

**Minimum balance:** 0.001 ETH to send messages

---

### Step 5: Register Your Address (Optional)

To let others find you by your wallet address:

1. Go to **Settings** → **Registry** tab
2. Click **Register meta-address**
3. Confirm the transaction

After registration, others can send you messages by entering just your wallet address.

---

## Understanding Keys

### Your Key Hierarchy

```
Stealth Keys (Generate / Import / Optional Wallet-Derive)
    │
    ├── View Key   → Scan messages, decrypt
    ├── Spend Key  → Own stealth addresses
    └── Meta-Address (share directly)

Signing Key (separate keypair)
    └── Sign blob transactions + pay gas

Optional Wallet (MetaMask, etc.)
    ├── Deterministic derive path
    └── Registry registration
```

### Key Usage Summary

| Key Type    | Used For                       | Where Stored                  |
| ----------- | ------------------------------ | ----------------------------- |
| Wallet      | Optional derivation + registry | MetaMask/browser wallet       |
| View Key    | Scanning, decrypting messages  | Encrypted in localStorage     |
| Spend Key   | Stealth address ownership      | Encrypted in localStorage     |
| **Signing** | **Signing blob transactions**  | **Encrypted in localStorage** |

**Important:** Your main wallet never sees or signs the actual message transactions. The signing key handles all blob transactions for privacy.

---

## Sending Messages

### Compose a Message

1. In the chat view, find the composer at the bottom
2. Enter the recipient's **meta-address** (preferred) or wallet address in the "To" field
3. Add a subject (optional)
4. Write your message
5. Click **Send message**

### Requirements to Send

Before you can send:

- ✅ Stealth keys set up (view + spend)
- ✅ Signing key generated
- ✅ Signing key funded with ETH (check balance in Settings)

### What Happens When You Send

```
1. App resolves recipient's stealth address
2. Encrypts message with ECDH + XChaCha20-Poly1305
3. Creates EIP-4844 blob with encrypted payload
4. Signs transaction with your signing key
5. Submits to network
6. Shows confirmation with transaction hash
```

### TTL (Time to Live)

Message availability follows blob retention (~18 days). After blob pruning:

- Unread blob content is no longer retrievable from the network
- Previously decrypted content may still exist locally on your device until you clear data

---

## Reading Messages

### Inbox

Messages appear automatically in the sidebar:

- **Blue badge** = Incoming message
- **Green badge** = Sent message

Click any message to read it.

### Sync Status

The sidebar footer shows sync status:

- Green dot = Synced
- Yellow dot = Syncing
- Click the refresh button to sync manually

Messages sync automatically every 60 seconds when the tab is visible.

---

## Settings

### Keys Tab

- View your public keys and meta-address
- **Generate/import/remove signing key**
- Check signing key balance
- Export private keys (for backup)
- Lock session (requires password to unlock)
- Reset keys (clear all stored data)

#### Managing Your Signing Key

**Generate New:**

1. Go to Settings → Keys
2. Click "Generate Signing Key"
3. Enter your password
4. Copy the new address and fund it

**Import Existing:**

1. Click "Import Signing Key"
2. Paste your private key (0x...)
3. Enter your password

**Remove:**

1. Click "Remove Signing Key"
2. Enter your password to confirm
3. Note: You won't be able to send messages until you add a new one

### Registry Tab

- View your registration status
- Register your meta-address
- Update your registration
- Connect a wallet only when you want to write registry updates

### Advanced Tab

- **History window** - How far back to scan for messages (affects sync speed)
- Network info
- Security details

---

## Privacy Best Practices

### Maximum Privacy Setup

For the most private messaging experience:

1. **Generate new keys** (don't derive from your main wallet)
2. **Fund signing key via privacypools.com**
3. **Use a fresh browser profile** or incognito mode
4. **Don't register** in the public registry (share meta-address directly)
5. **Clear keys** when done (Settings → Keys → Clear Keys)

### Understanding the Privacy Model

**What's Private:**

- Recipient identity (stealth addresses)
- Message content (end-to-end encrypted)
- Sender identity (if using privacypools.com for funding)

**What's Public:**

- A message was sent (visible on-chain)
- When it was sent (in transaction/block history)
- Minimal metadata (`version` and `payloadHash`)
- The signing address used (but this is a stealth address)

**What Stays Private Forever:**

- Your main wallet address (if you use privacypools.com)
- The actual message content (encrypted)
- The recipient's real address

---

## Troubleshooting

### "No signing key configured"

You need to generate and fund a signing key:

1. Go to Settings → Keys
2. Click "Generate Signing Key"
3. Copy the address
4. Send Sepolia ETH to that address
5. Refresh the page

### "Low balance"

Your signing key needs ETH to pay for gas:

1. Check balance in Settings → Keys
2. Send more Sepolia ETH to your signing address
3. Wait a few seconds and refresh

### "No meta-address found for this wallet"

The recipient hasn't registered. Ask them to:

1. Go to Settings → Registry
2. Register their meta-address

Or ask them to share their full meta-address directly.

### "Failed to send message"

- Check you have enough Sepolia ETH for gas (signing key balance)
- Ensure your signing key is configured (Settings → Keys)
- Try refreshing the page

### Messages not loading

- Check the sync status in the sidebar footer
- Try the refresh button
- Increase the history window in Settings → Advanced
- Verify your RPC endpoint is working

### "Password incorrect" on unlock

If you forgot your password:

1. Click **Forgot password?**
2. Re-run onboarding to derive/import keys again

Note: This clears your stored keys, but messages on-chain are still readable if you have the same keys.

---

## FAQ

**Q: Why do I need a separate signing key?**

A: Browser wallets like MetaMask cannot sign EIP-4844 blob transactions. The signing key handles this while maintaining your privacy (it's a stealth address).

**Q: Can I use the app without connecting a wallet?**

A: Yes. Core send/receive works with generated or imported keys plus a funded signing key. Wallet connection is optional and mainly used for deterministic derivation and registry registration.

**Q: Can I use my main wallet to send messages?**

A: No, your main wallet doesn't support blob transactions. You must use the signing key.

**Q: Is the signing key safe?**

A: Yes. It's encrypted with the same password as your other keys and stored locally. It cannot be linked to your main wallet.

**Q: What happens if I lose my signing key?**

A: You can generate a new one in Settings → Keys. You'll need to fund the new address with ETH.

**Q: Can someone trace messages back to me?**

A: Only if you fund the signing key from your main wallet. Use privacypools.com for anonymous funding.

**Q: Do I need to back up the signing key?**

A: It's recommended but not critical. You can always generate a new one and fund it.
