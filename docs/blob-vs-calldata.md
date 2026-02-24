# Blob vs Calldata: Message Storage Trade-offs

**Date:** January 30, 2026  
**Status:** Decision Document

## Overview

This document analyzes the trade-offs between using EIP-4844 blobs versus regular calldata for storing encrypted message payloads in Ephereum Chat.

---

## Current Implementation

Ephereum Chat currently uses **EIP-4844 blobs** for message payloads:

- Encrypted message stored in blob data
- Announcement event emitted with metadata only
- Blob data auto-pruned after ~18 days

---

## Cost Comparison

### Gas Costs by Approach

| Approach            | Data Cost              | Permanence | Complexity |
| ------------------- | ---------------------- | ---------- | ---------- |
| **Calldata**        | ~16 gas/byte           | Forever    | Simple     |
| **Blob (EIP-4844)** | ~1 gas/byte equivalent | ~18 days   | Complex    |

### Example: 500-byte Encrypted Message

| Method   | Approximate Gas Cost                                 |
| -------- | ---------------------------------------------------- |
| Calldata | ~8,000 gas (data) + ~25,000 (base) = **~33,000 gas** |
| Blob     | ~131,072 blob gas (fixed) + ~25,000 (execution)      |

### Cost in ETH (at typical gas prices)

| Message Size | Calldata Cost | Blob Cost   |
| ------------ | ------------- | ----------- |
| 100 bytes    | ~0.0001 ETH   | ~0.0002 ETH |
| 500 bytes    | ~0.0002 ETH   | ~0.0002 ETH |
| 2 KB         | ~0.0006 ETH   | ~0.0002 ETH |
| 10 KB        | ~0.003 ETH    | ~0.0002 ETH |
| 50 KB        | ~0.015 ETH    | ~0.0002 ETH |

**Break-even point:** ~1-2 KB. Below this, calldata is cheaper. Above this, blobs are cheaper.

---

## Privacy Comparison

### The Critical Difference

| Approach     | Data Retention | Privacy Impact                        |
| ------------ | -------------- | ------------------------------------- |
| **Blob**     | ~18 days       | Ephemeral - aligns with privacy goals |
| **Calldata** | Forever        | Permanent - defeats ephemerality goal |

### Why This Matters

If encrypted messages are stored in calldata:

1. **Permanent record**: Block explorers show transaction data forever
2. **Archive nodes**: Retain all historical data indefinitely
3. **Future risk**: If encryption is ever broken (quantum computing, key compromise), all historical messages can be decrypted
4. **Correlation attacks**: Permanent data enables long-term traffic analysis

With blobs:

1. **Auto-deletion**: Beacon nodes prune blob data after ~4096 epochs (~18 days)
2. **No recovery**: After pruning, message content is unrecoverable
3. **Limited window**: Attackers have only ~18 days to capture blob data

---

## Implementation Comparison

### Option A: Calldata (Simpler)

```solidity
// Modified contract
event MessageEnvelope(
    address indexed recipientStealthAddress,
    bytes ephemeralPubKey,
    bytes1 viewTag,
    bytes metadata,
    bytes encryptedPayload  // NEW: message inline
);

function announce(
    address recipientStealthAddress,
    bytes calldata ephemeralPubKey,
    bytes1 viewTag,
    bytes calldata metadata,
    bytes calldata encryptedPayload  // NEW
) external {
    emit MessageEnvelope(
        recipientStealthAddress,
        ephemeralPubKey,
        viewTag,
        metadata,
        encryptedPayload
    );
}
```

**Pros:**

- Simpler implementation
- No blob indexer dependency (Blobscan)
- Easier message retrieval
- Cheaper for small messages (< 1 KB)

**Cons:**

- Messages stored forever (violates ephemerality)
- Higher cost for larger messages
- Larger permanent blockchain footprint

### Option B: Blobs (Current)

```typescript
// Current implementation
const blobSidecars = await buildBlobSidecars({ payload: encryptedHex });
const tx = await sendTransaction({
  to: ANNOUNCER_ADDRESS,
  data: announceCalldata,
  blobs: blobSidecars.blobs,
  // ...
});
```

**Pros:**

- Messages auto-delete after ~18 days
- Fixed cost regardless of message size
- Smaller permanent blockchain footprint
- Better long-term privacy

**Cons:**

- More complex implementation
- Requires blob indexer for retrieval
- Slightly higher cost for tiny messages

---

## Hybrid Approach (Optional)

For cost optimization while preserving privacy awareness:

```typescript
const MESSAGE_SIZE_THRESHOLD = 500; // bytes
const USE_EPHEMERAL_DEFAULT = true;

type MessageOptions = {
  forceEphemeral?: boolean; // Override for privacy-conscious users
};

async function sendMessage(payload: MessagePayload, options: MessageOptions = {}) {
  const encrypted = await encryptPayload(payload);
  const size = encrypted.ciphertext.length;

  // Default to ephemeral (blobs) unless explicitly overridden
  const useBlob = options.forceEphemeral ?? (USE_EPHEMERAL_DEFAULT || size > MESSAGE_SIZE_THRESHOLD);

  if (useBlob) {
    return sendWithBlob(encrypted);
  } else {
    // Show warning to user
    console.warn('Message will be stored permanently on-chain');
    return sendWithCalldata(encrypted);
  }
}
```

**Warning:** This approach requires clear user consent for permanent storage.

---

## Decision Matrix

| Priority                               | Recommended Approach                  |
| -------------------------------------- | ------------------------------------- |
| **Privacy-first** (ephemeral messages) | Use blobs (current)                   |
| **Cost-first** (permanent OK)          | Switch to calldata                    |
| **Hybrid**                             | Size-based routing with user warnings |

---

## Recommendation

**Keep using blobs** for the following reasons:

1. **Aligns with core value proposition**: Ephereum Chat markets itself as ephemeral/private messaging
2. **Future-proof privacy**: Even if encryption is someday broken, messages are already deleted
3. **Predictable costs**: Fixed blob cost vs variable calldata cost
4. **Regulatory compliance**: Some jurisdictions may require message deletion capabilities

The added complexity of blob handling is justified by the privacy benefits.

---

## Future Considerations

### Short-term

- Monitor blob gas prices for cost optimization
- Consider fallback to calldata if blob gas spikes (with user warning)

### Medium-term

- Evaluate EIP-4844 successor proposals (Danksharding)
- Consider layer-2 solutions for cheaper messaging

### Long-term

- Watch for post-quantum encryption standards
- Evaluate alternative ephemeral storage solutions

---

## References

- [EIP-4844: Shard Blob Transactions](https://eips.ethereum.org/EIPS/eip-4844)
- [Blob Gas Price Tracker](https://blobscan.com/stats)
- [Ephereum Chat Security Audit](./security-audit.md)
