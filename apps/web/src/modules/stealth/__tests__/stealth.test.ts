import { describe, expect, it } from 'vitest';
import { encodeMetaAddress, parseMetaAddress } from '../meta-address';
import { getCompressedPublicKey, getSenderStealthAddress, recoverStealthPrivKey } from '../stealth';

describe('stealth utils', () => {
  it('encodes and parses meta-address', () => {
    const spendPrivKey = '0x1'.padEnd(66, '0') as `0x${string}`;
    const viewPrivKey = '0x2'.padEnd(66, '0') as `0x${string}`;
    const spendPubKey = getCompressedPublicKey({ privateKey: spendPrivKey });
    const viewPubKey = getCompressedPublicKey({ privateKey: viewPrivKey });

    const encoded = encodeMetaAddress({
      metaAddress: {
        scheme: 0x02,
        spendPubKey,
        viewPubKey,
      },
    });
    const parsed = parseMetaAddress({ raw: encoded });

    expect(parsed.scheme).toBe(0x02);
    expect(parsed.spendPubKey).toBe(spendPubKey);
    expect(parsed.viewPubKey).toBe(viewPubKey);
  });

  it('derives and recovers stealth key', async () => {
    const spendPrivKey = '0x3'.padEnd(66, '0') as `0x${string}`;
    const viewPrivKey = '0x4'.padEnd(66, '0') as `0x${string}`;
    const spendPubKey = getCompressedPublicKey({ privateKey: spendPrivKey });
    const viewPubKey = getCompressedPublicKey({ privateKey: viewPrivKey });
    const metaAddress = encodeMetaAddress({
      metaAddress: { scheme: 0x02, spendPubKey, viewPubKey },
    });

    const sender = await getSenderStealthAddress({
      metaAddress,
      ephemPrivKey: '0x5'.padEnd(66, '0') as `0x${string}`,
    });
    const recovered = recoverStealthPrivKey({
      viewPrivKey,
      spendPrivKey,
      ephemPubKey: sender.ephemPubKey,
      viewTag: sender.viewTag,
    });

    expect(recovered.stealthAddress).toBe(sender.stealthAddress);
  });
});
