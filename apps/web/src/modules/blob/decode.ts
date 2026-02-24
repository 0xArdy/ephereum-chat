import { fromBlobs } from 'viem';
import { decryptMessagePayload } from '../messages/payload';
import { decodeBlobPayload } from './payload';

/**
 * Decrypt a blob message using the recipient's view private key and sender's ephemeral public key.
 *
 * The blob data from Blobscan is the raw 128 KiB blob. We need to extract the actual
 * payload data using viem's fromBlobs, then decode and decrypt.
 */
export async function decryptBlobMessage({
  blobHex,
  viewPrivKey,
  ephemPubKey,
  context = 'stealth-chat-v1',
}: {
  blobHex: `0x${string}`;
  viewPrivKey: `0x${string}`;
  ephemPubKey: `0x${string}`;
  context?: string;
}) {
  // Extract actual payload data from the blob (handles EIP-4844 encoding/padding)
  let payloadHex: `0x${string}`;
  try {
    payloadHex = fromBlobs({ blobs: [blobHex], to: 'hex' });
  } catch {
    // If fromBlobs fails, assume the data is already in raw payload format (legacy/test)
    payloadHex = blobHex;
  }

  const { nonce, ciphertext } = decodeBlobPayload({ hex: payloadHex });

  return decryptMessagePayload({
    viewPrivKey,
    ephemPubKey,
    ciphertext,
    nonce,
    context,
  });
}
