const EXPLORER_BASE_URL = 'https://sepolia.etherscan.io';

export function getExplorerTxUrl(hash: string): string {
  return `${EXPLORER_BASE_URL}/tx/${hash}`;
}
