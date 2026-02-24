import { privateKeyToAccount } from 'viem/accounts';
import { deriveKeyFromSignature } from '../crypto/hkdf';
import { generateSecp256k1KeyPair } from '../stealth/keys';

export const SIGNATURE_MESSAGE =
  'Ephereum Chat Key Derivation v1\n\nSign this message to derive your stealth address keys.\n\nThis signature is used to deterministically generate your view and spend keys.';

export type DerivedKeys = {
  viewPrivKey: `0x${string}`;
  spendPrivKey: `0x${string}`;
};

export type SigningKey = {
  privateKey: `0x${string}`;
  address: `0x${string}`;
};

export function deriveKeysFromSignature(signature: `0x${string}`): DerivedKeys {
  const viewPrivKey = deriveKeyFromSignature(signature, 'ephereum-view-key-v1');
  const spendPrivKey = deriveKeyFromSignature(signature, 'ephereum-spend-key-v1');

  return {
    viewPrivKey: viewPrivKey as `0x${string}`,
    spendPrivKey: spendPrivKey as `0x${string}`,
  };
}

export function generateNewKeys(): DerivedKeys {
  const view = generateSecp256k1KeyPair();
  const spend = generateSecp256k1KeyPair();

  return {
    viewPrivKey: view.privateKey,
    spendPrivKey: spend.privateKey,
  };
}

export function importKeys(viewPrivKey: string, spendPrivKey: string): DerivedKeys | null {
  if (!isValidPrivateKey(viewPrivKey) || !isValidPrivateKey(spendPrivKey)) {
    return null;
  }

  return {
    viewPrivKey: viewPrivKey as `0x${string}`,
    spendPrivKey: spendPrivKey as `0x${string}`,
  };
}

function isValidPrivateKey(value: string): boolean {
  return value.startsWith('0x') && value.length === 66;
}

export function generateSigningKey(): SigningKey {
  const keyPair = generateSecp256k1KeyPair();
  const account = privateKeyToAccount(keyPair.privateKey);
  return {
    privateKey: keyPair.privateKey,
    address: account.address,
  };
}

export function deriveSigningKeyFromPrivateKey(privateKey: string): SigningKey | null {
  if (!isValidPrivateKey(privateKey)) {
    return null;
  }
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return {
    privateKey: privateKey as `0x${string}`,
    address: account.address,
  };
}
