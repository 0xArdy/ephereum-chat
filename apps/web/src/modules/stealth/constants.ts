// MessageEnvelopeRegistry - our custom contract for this app
export const MESSAGE_ENVELOPE_REGISTRY = '0xe42A8d79AE1e4bbA02F753c592C43941f442c9A7' as `0x${string}`;
export const ANNOUNCER_SINGLETON = MESSAGE_ENVELOPE_REGISTRY;
export const SCHEME_ID = 0x02;

// EIP-4844 blob retention period (~18 days / 4096 epochs)
// After this time, blobs are pruned from beacon nodes
export const BLOB_RETENTION_MS = 18 * 24 * 60 * 60 * 1000; // ~1,555,200,000 ms
