import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { toHex, type Hex } from 'viem';
import { hexToBytes } from '../../utils/hex';

export function deriveKeyFromSignature(signature: Hex, info: string): Hex {
  const sigBytes = hexToBytes(signature);
  const infoBytes = utf8ToBytes(info);
  const salt = new Uint8Array(32);
  const derivedKey = hkdf(sha256, sigBytes, salt, infoBytes, 32);
  return toHex(derivedKey) as Hex;
}
