import { toHex } from 'viem';
import { hexToBytes } from '../../utils/hex';

const STORAGE_KEY = 'ephereum_keys_v1';
const PBKDF2_ITERATIONS = 100000;

export type KeyBundle = {
  viewPrivKey: string;
  spendPrivKey: string;
  createdAt: number;
  derivationMethod: 'signature' | 'imported' | 'generated';
  signingPrivKey?: string;
};

export type EncryptedKeyBundle = {
  ciphertext: string;
  iv: string;
  salt: string;
  version: 1;
};

export function hasStoredKeys(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null;
  } catch {
    return false;
  }
}

export function getStoredBundle(): EncryptedKeyBundle | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as EncryptedKeyBundle;
  } catch {
    return null;
  }
}

export async function storeKeys(bundle: KeyBundle, password: string): Promise<void> {
  const encrypted = await encryptBundle(bundle, password);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
}

export async function loadKeys(password: string): Promise<KeyBundle | null> {
  const encrypted = getStoredBundle();
  if (!encrypted) return null;

  try {
    return await decryptBundle(encrypted, password);
  } catch {
    return null;
  }
}

export function clearKeys(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

async function encryptBundle(bundle: KeyBundle, password: string): Promise<EncryptedKeyBundle> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassword(password, salt);

  const plaintext = new TextEncoder().encode(JSON.stringify(bundle));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, key, plaintext);

  return {
    ciphertext: bufferToHex(ciphertext),
    iv: bufferToHex(iv),
    salt: bufferToHex(salt),
    version: 1,
  };
}

async function decryptBundle(encrypted: EncryptedKeyBundle, password: string): Promise<KeyBundle> {
  const salt = hexToBytes(encrypted.salt);
  const iv = hexToBytes(encrypted.iv);
  const ciphertext = hexToBytes(encrypted.ciphertext);
  const key = await deriveKeyFromPassword(password, salt);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer,
  );
  const text = new TextDecoder().decode(plaintext);
  return JSON.parse(text) as KeyBundle;
}

async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return toHex(bytes);
}
