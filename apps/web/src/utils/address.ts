export function truncateAddress(value: string): string {
  if (!value || value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatAddress(address?: string): string {
  if (!address) return 'Not connected';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function isLikelyAddress(value: string): boolean {
  return value.startsWith('0x') && value.length >= 42;
}

export function truncateString(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, Math.floor(maxLen / 2) - 2)}...${str.slice(-Math.floor(maxLen / 2) + 2)}`;
}

export function formatTxHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}
