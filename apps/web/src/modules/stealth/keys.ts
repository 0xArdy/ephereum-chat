import * as secp from '@noble/secp256k1';
import { toHex } from 'viem';

export type Secp256k1KeyPair = {
  privateKey: `0x${string}`;
  publicKey: `0x${string}`;
};

/**
 * Generate a random secp256k1 keypair for use in stealth address derivation and encryption.
 */
export function generateSecp256k1KeyPair(): Secp256k1KeyPair {
  const secpUtils = secp.utils as unknown as {
    randomSecretKey?: () => Uint8Array;
    randomPrivateKey?: () => Uint8Array;
  };

  const privateKeyBytes = secpUtils.randomSecretKey?.() ?? secpUtils.randomPrivateKey?.();

  if (!privateKeyBytes) throw new Error('No compatible secp256k1 random key generator found');
  const publicKeyBytes = secp.getPublicKey(privateKeyBytes, true);

  return {
    privateKey: toHex(privateKeyBytes) as `0x${string}`,
    publicKey: toHex(publicKeyBytes) as `0x${string}`,
  };
}
