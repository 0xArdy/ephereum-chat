import { describe, expect, it } from 'vitest';
import { decodeBlobPayload, encodeBlobPayload, getBlobPayloadHash } from '../payload';

describe('blob payload', () => {
  it('encodes and decodes blob payload', () => {
    const nonce = new Uint8Array(24).fill(1);
    const ciphertext = new Uint8Array([1, 2, 3, 4]);
    const hex = encodeBlobPayload({ nonce, ciphertext });
    const decoded = decodeBlobPayload({ hex });

    expect(decoded.nonce).toEqual(nonce);
    expect(decoded.ciphertext).toEqual(ciphertext);
  });

  it('hashes payload', () => {
    const nonce = new Uint8Array(24).fill(2);
    const ciphertext = new Uint8Array([9, 9]);
    const hex = encodeBlobPayload({ nonce, ciphertext });
    const hash = getBlobPayloadHash({ hex });

    expect(hash.startsWith('0x')).toBe(true);
  });
});
