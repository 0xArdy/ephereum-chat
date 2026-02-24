import * as secp from '@noble/secp256k1';
import { toBytes } from 'viem';
import { deriveSymmetricKey, encryptPayload, decryptPayload } from '../crypto/encryption';

export type MessagePayload = {
  version: 'v1';
  threadId: string;
  content: string;
  contentType: 'text/plain';
};

/**
 * Encrypt a message payload using secp256k1 ECDH.
 * Uses the ephemeral private key and recipient's view public key to derive a shared secret.
 */
export async function encryptMessagePayload({
  ephemPrivKey,
  viewPubKey,
  payload,
  context = 'stealth-chat-v1',
}: {
  ephemPrivKey: `0x${string}`;
  viewPubKey: `0x${string}`;
  payload: MessagePayload;
  context?: string;
}) {
  const sharedSecret = deriveSecp256k1SharedSecret({
    privateKey: ephemPrivKey,
    publicKey: viewPubKey,
  });
  const key = await deriveSymmetricKey({
    sharedSecret,
    context,
  });
  const message = JSON.stringify(payload);
  const { ciphertext, nonce } = await encryptPayload({
    key,
    message,
  });

  return {
    ciphertext,
    nonce,
  };
}

/**
 * Decrypt a message payload using secp256k1 ECDH.
 * Uses the recipient's view private key and sender's ephemeral public key to derive the shared secret.
 */
export async function decryptMessagePayload({
  viewPrivKey,
  ephemPubKey,
  ciphertext,
  nonce,
  context = 'stealth-chat-v1',
}: {
  viewPrivKey: `0x${string}`;
  ephemPubKey: `0x${string}`;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  context?: string;
}) {
  const sharedSecret = deriveSecp256k1SharedSecret({
    privateKey: viewPrivKey,
    publicKey: ephemPubKey,
  });
  const key = await deriveSymmetricKey({
    sharedSecret,
    context,
  });
  const message = await decryptPayload({
    key,
    ciphertext,
    nonce,
  });

  return JSON.parse(message) as MessagePayload;
}

function deriveSecp256k1SharedSecret({
  privateKey,
  publicKey,
}: {
  privateKey: `0x${string}`;
  publicKey: `0x${string}`;
}) {
  const privBytes = toBytes(privateKey);
  const pubBytes = toBytes(publicKey);
  const shared = secp.getSharedSecret(privBytes, pubBytes, true);
  // Strip the prefix byte (0x02 or 0x03) to get the raw x-coordinate
  return shared.slice(1);
}

export function buildMessagePayload({ content, threadId }: { content: string; threadId: string }): MessagePayload {
  if (!content.trim()) throw new Error('Message content is required');
  if (!threadId.trim()) throw new Error('Thread id is required');

  return {
    version: 'v1',
    threadId,
    content,
    contentType: 'text/plain',
  };
}
