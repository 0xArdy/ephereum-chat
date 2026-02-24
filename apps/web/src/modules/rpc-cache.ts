import { getPublicClient } from 'wagmi/actions';
import { config } from '../wagmi';
import type { AbiEvent, Address, Log } from 'viem';

type LogCacheKey = string;
type LogCache = {
  logs: Log[];
  timestamp: number;
};

const logCache = new Map<LogCacheKey, LogCache>();
const pendingLogs = new Map<LogCacheKey, Promise<Log[]>>();

const LOG_CACHE_TTL = 10000;

export async function getLogsCached(params: {
  address: Address;
  fromBlock: bigint;
  toBlock: bigint;
  event: AbiEvent;
}): Promise<Log[]> {
  const { address, fromBlock, toBlock, event } = params;
  const cacheKey = `${address}-${fromBlock}-${toBlock}`;
  const now = Date.now();

  const cached = logCache.get(cacheKey);
  if (cached && now - cached.timestamp < LOG_CACHE_TTL) {
    return cached.logs;
  }

  const pending = pendingLogs.get(cacheKey);
  if (pending) {
    return pending;
  }

  const publicClient = getPublicClient(config);
  if (!publicClient) throw new Error('No public client available');

  const promise = publicClient.getLogs({ address, event, fromBlock, toBlock }).then((logs: Log[]) => {
    logCache.set(cacheKey, { logs, timestamp: Date.now() });
    pendingLogs.delete(cacheKey);
    return logs;
  });

  pendingLogs.set(cacheKey, promise);
  return promise;
}

export function invalidateCache(): void {
  logCache.clear();
}
