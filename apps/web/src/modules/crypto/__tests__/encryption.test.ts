import { describe, expect, it } from 'vitest';
import { decryptPayload, deriveSharedSecret, deriveSymmetricKey, encryptPayload, generateKeyPair } from '../encryption';

describe('crypto helpers', () => {
  it('derives matching shared secrets from key pairs', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const aliceSecret = await deriveSharedSecret({
      recipientPublicKey: bob.publicKey,
      senderSecretKey: alice.secretKey,
    });
    const bobSecret = await deriveSharedSecret({
      recipientPublicKey: alice.publicKey,
      senderSecretKey: bob.secretKey,
    });

    expect(aliceSecret).toEqual(bobSecret);
  });

  it('encrypts and decrypts with derived key', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const sharedSecret = await deriveSharedSecret({
      recipientPublicKey: bob.publicKey,
      senderSecretKey: alice.secretKey,
    });
    const key = await deriveSymmetricKey({
      sharedSecret,
      context: 'ephereum-chat-test',
    });
    const plaintext = 'ephereum chat test';

    const { ciphertext, nonce } = await encryptPayload({
      key,
      message: plaintext,
    });
    const decrypted = await decryptPayload({
      key,
      ciphertext,
      nonce,
    });

    expect(decrypted).toBe(plaintext);
  });
});
