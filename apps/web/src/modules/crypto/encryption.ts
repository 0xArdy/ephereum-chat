/**
 * Encryption utilities using @noble libraries.
 *
 * - Key exchange: X25519 ECDH (for the demo sandbox)
 * - Key derivation: HKDF-SHA256
 * - Symmetric encryption: XChaCha20-Poly1305
 *
 * Note: For actual Ephereum Chat messages, we use secp256k1 ECDH
 * (in payload.ts) to reuse stealth address keys. This module
 * provides the symmetric encryption primitives.
 */
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';

export async function generateKeyPair() {
  const secretKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(secretKey);

  return {
    publicKey,
    secretKey,
  };
}

export async function deriveSharedSecret({
  recipientPublicKey,
  senderSecretKey,
}: {
  recipientPublicKey: Uint8Array;
  senderSecretKey: Uint8Array;
}) {
  return x25519.getSharedSecret(senderSecretKey, recipientPublicKey);
}

export async function deriveSymmetricKey({ sharedSecret, context }: { sharedSecret: Uint8Array; context: string }) {
  const info = utf8ToBytes(context);
  const salt = new Uint8Array(32);

  return hkdf(sha256, sharedSecret, salt, info, 32);
}

export async function encryptPayload({
  key,
  message,
  additionalData,
}: {
  key: Uint8Array;
  message: string;
  additionalData?: string;
}) {
  const nonce = randomBytes(24);
  const cipher = xchacha20poly1305(key, nonce);
  const messageBytes = utf8ToBytes(message);
  const additionalBytes = additionalData ? utf8ToBytes(additionalData) : undefined;
  const ciphertext = cipher.encrypt(messageBytes, additionalBytes);

  return {
    ciphertext,
    nonce,
  };
}

export async function decryptPayload({
  key,
  ciphertext,
  nonce,
  additionalData,
}: {
  key: Uint8Array;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  additionalData?: string;
}) {
  const cipher = xchacha20poly1305(key, nonce);
  const additionalBytes = additionalData ? utf8ToBytes(additionalData) : undefined;
  const plaintextBytes = cipher.decrypt(ciphertext, additionalBytes);

  return new TextDecoder().decode(plaintextBytes);
}
