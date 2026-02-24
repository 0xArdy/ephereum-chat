import * as secp from '@noble/secp256k1';
import { keccak256, toBytes, toHex } from 'viem';
import { parseMetaAddress } from './meta-address';

export type SenderDerivationResult = {
  stealthAddress: `0x${string}`;
  stealthPubKey: `0x${string}`;
  viewTag: `0x${string}`;
  ephemPrivKey: `0x${string}`;
  ephemPubKey: `0x${string}`;
};

export type KeyRecoveryInput = {
  viewPrivKey: `0x${string}`;
  spendPrivKey: `0x${string}`;
  ephemPubKey: `0x${string}`;
  viewTag: `0x${string}`;
};

export async function getSenderStealthAddress({
  metaAddress,
  ephemPrivKey,
}: {
  metaAddress: string;
  ephemPrivKey?: `0x${string}`;
}): Promise<SenderDerivationResult> {
  const parsed = parseMetaAddress({ raw: metaAddress });
  const secpUtils = secp.utils as unknown as {
    randomSecretKey?: () => Uint8Array;
    randomPrivateKey?: () => Uint8Array;
  };
  const ephemPrivBytes = ephemPrivKey
    ? hexToBytes({ hex: ephemPrivKey })
    : (secpUtils.randomSecretKey?.() ?? secpUtils.randomPrivateKey?.());

  if (!ephemPrivBytes) throw new Error('No compatible secp256k1 random key generator found');
  const ephemPrivHex = toHex(ephemPrivBytes);
  const ephemPubHex = toHex(secp.getPublicKey(ephemPrivBytes, true));

  const viewPubBytes = hexToBytes({ hex: parsed.viewPubKey });
  const sharedSecret = secp.getSharedSecret(ephemPrivBytes, viewPubBytes, true);
  const sharedSecretStripped = sharedSecret.slice(1);
  const tagHex = keccak256(sharedSecretStripped).slice(0, 4);
  const viewTag = `0x${tagHex.slice(2)}` as `0x${string}`;

  const tweak = hashSharedSecret({ sharedSecret: sharedSecretStripped, viewTag: viewTag as `0x${string}` });
  const spendPubPoint = secp.Point.fromHex(parsed.spendPubKey.slice(2));
  const stealthPoint = spendPubPoint.add(secp.Point.BASE.multiply(tweak));
  const stealthPubKey = toHex(stealthPoint.toBytes(true));
  const stealthAddress = toEthAddress({ uncompressedPubKey: stealthPoint.toBytes(false) });

  return {
    stealthAddress,
    stealthPubKey,
    viewTag: viewTag as `0x${string}`,
    ephemPrivKey: ephemPrivHex as `0x${string}`,
    ephemPubKey: ephemPubHex as `0x${string}`,
  };
}

export function recoverStealthPrivKey({ viewPrivKey, spendPrivKey, ephemPubKey, viewTag }: KeyRecoveryInput): {
  stealthAddress: `0x${string}`;
  stealthPrivKey: `0x${string}`;
} {
  const viewPriv = hexToBigInt({ hex: viewPrivKey });
  const spendPriv = hexToBigInt({ hex: spendPrivKey });
  const ephemPubPoint = secp.Point.fromHex(ephemPubKey.slice(2));
  const shared = ephemPubPoint.multiply(viewPriv).toBytes(true).slice(1);
  const expectedTag = `0x${keccak256(shared).slice(2, 4)}`;

  if (expectedTag.toLowerCase() !== viewTag.toLowerCase())
    throw new Error('Announcement not intended for this recipient');

  const tweak = hashSharedSecret({ sharedSecret: shared, viewTag });
  const curveN = getCurveOrder();
  const stealthPriv = (spendPriv + tweak) % curveN;
  const stealthPrivKey = toHex(stealthPriv, { size: 32 });
  const stealthPubKey = secp.getPublicKey(hexToBytes({ hex: stealthPrivKey }), false);
  const stealthAddress = toEthAddress({ uncompressedPubKey: stealthPubKey });

  return { stealthPrivKey, stealthAddress };
}

export function getCompressedPublicKey({ privateKey }: { privateKey: `0x${string}` }) {
  return toHex(secp.getPublicKey(hexToBytes({ hex: privateKey }), true));
}

export function buildMetaAddress({
  viewPubKey,
  spendPubKey,
}: {
  viewPubKey: `0x${string}`;
  spendPubKey: `0x${string}`;
}) {
  // st:eth:0x02<spendPubKey><viewPubKey>
  const spend = spendPubKey.slice(2);
  const view = viewPubKey.slice(2);
  return `st:eth:0x02${spend}${view}`;
}

function hashSharedSecret({ sharedSecret, viewTag }: { sharedSecret: Uint8Array; viewTag: `0x${string}` }) {
  const tagBytes = hexToBytes({ hex: viewTag });
  const preimage = new Uint8Array(33);
  preimage.set(sharedSecret, 0);
  preimage.set(tagBytes, 32);
  const hashHex = keccak256(preimage);

  return BigInt(hashHex) % getCurveOrder();
}

function getCurveOrder() {
  const pointCtor = secp.Point as unknown as {
    CURVE?: () => { n: bigint };
  };

  if (pointCtor.CURVE) return pointCtor.CURVE().n;

  const secpWithCurve = secp as unknown as {
    CURVE?: { n: bigint };
  };

  if (secpWithCurve.CURVE) return secpWithCurve.CURVE.n;

  throw new Error('No compatible secp256k1 curve order API found');
}

function toEthAddress({ uncompressedPubKey }: { uncompressedPubKey: Uint8Array }) {
  const addressHash = keccak256(uncompressedPubKey.slice(1));
  return `0x${addressHash.slice(-40)}` as `0x${string}`;
}

function hexToBytes({ hex }: { hex: `0x${string}` }) {
  return toBytes(hex);
}

function hexToBigInt({ hex }: { hex: `0x${string}` }) {
  return BigInt(hex);
}
