import { describe, expect, it } from 'vitest';
import { getCompressedPublicKey } from '../../stealth/stealth';
import { buildMessagePayload, decryptMessagePayload, encryptMessagePayload } from '../payload';

describe('message payload', () => {
  it('encrypts and decrypts payload using secp256k1 ECDH', async () => {
    // Sender's ephemeral key (secp256k1)
    const ephemPrivKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
    const ephemPubKey = getCompressedPublicKey({ privateKey: ephemPrivKey });

    // Recipient's view key (secp256k1)
    const viewPrivKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`;
    const viewPubKey = getCompressedPublicKey({ privateKey: viewPrivKey });

    const payload = buildMessagePayload({
      content: 'hello',
      threadId: 'thread-1',
    });

    const encrypted = await encryptMessagePayload({
      ephemPrivKey,
      viewPubKey,
      payload,
      context: 'test',
    });
    const decrypted = await decryptMessagePayload({
      viewPrivKey,
      ephemPubKey,
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      context: 'test',
    });

    expect(decrypted.content).toBe(payload.content);
    expect(decrypted.threadId).toBe(payload.threadId);
  });

  it('throws on invalid payload inputs', () => {
    expect(() => buildMessagePayload({ content: '', threadId: 'thread' })).toThrow();
    expect(() => buildMessagePayload({ content: 'hi', threadId: '' })).toThrow();
  });
});
