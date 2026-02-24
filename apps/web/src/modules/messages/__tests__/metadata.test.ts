import { toHex } from 'viem';
import { describe, expect, it } from 'vitest';
import { decodeAnnouncementMetadata, encodeAnnouncementMetadata } from '../metadata';

describe('announcement metadata', () => {
  it('encodes and decodes metadata', () => {
    const metadata = {
      version: 'v1' as const,
      payloadHash: `0x${'ab'.repeat(32)}` as `0x${string}`,
    };

    const hex = encodeAnnouncementMetadata({ metadata });
    const decoded = decodeAnnouncementMetadata({ hex });

    expect(decoded).toEqual(metadata);
  });

  it('returns null for empty metadata', () => {
    expect(decodeAnnouncementMetadata({ hex: '0x' })).toBeNull();
  });

  it('returns null for unsupported metadata version', () => {
    const hex = toHex(JSON.stringify({ version: 'legacy' })) as `0x${string}`;
    expect(decodeAnnouncementMetadata({ hex })).toBeNull();
  });

  it('throws on invalid payload hash', () => {
    expect(() =>
      encodeAnnouncementMetadata({
        metadata: {
          version: 'v1',
          payloadHash: '0xabc' as `0x${string}`,
        },
      }),
    ).toThrow('payloadHash must be a 32-byte hex string');
  });
});
