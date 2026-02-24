import { toHex, hexToString } from 'viem';

export type AnnouncementMetadata = {
  version: 'v1';
  payloadHash?: `0x${string}`;
};

export function encodeAnnouncementMetadata({ metadata }: { metadata: AnnouncementMetadata }) {
  if (metadata.version !== 'v1') throw new Error('Unsupported metadata version');
  if (metadata.payloadHash && !isPayloadHash(metadata.payloadHash)) {
    throw new Error('payloadHash must be a 32-byte hex string');
  }

  const json = JSON.stringify(metadata);
  return toHex(json);
}

export function decodeAnnouncementMetadata({ hex }: { hex: `0x${string}` }) {
  if (hex === '0x') return null;

  try {
    const json = hexToString(hex);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (parsed.version !== 'v1') return null;

    const payloadHash = parsed.payloadHash;
    if (payloadHash !== undefined) {
      if (typeof payloadHash !== 'string' || !isPayloadHash(payloadHash)) return null;
      return { version: 'v1', payloadHash };
    }

    return { version: 'v1' };
  } catch {
    return null;
  }
}

function isPayloadHash(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}
