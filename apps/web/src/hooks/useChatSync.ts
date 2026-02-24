import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPublicClient } from 'wagmi/actions';
import { fetchBlobFromBlobscan } from '../modules/blob/blobscan';
import { decryptBlobMessage } from '../modules/blob/decode';
import { scanAnnouncements, type ScanMatch } from '../modules/stealth/scan';
import { compareChatMessagesByChainAsc, toUserErrorMessage, type ChatMessage } from '../utils';
import { config } from '../wagmi';

type SyncState = 'idle' | 'syncing' | 'error';

export type PendingAnnouncement = {
  id: string;
  createdAt: number;
  blockNumber: bigint | null;
  logIndex: number | null;
  transactionHash: `0x${string}`;
  payloadHash?: string;
  ephemPubKey: `0x${string}`;
  viewTag: `0x${string}`;
  sender?: string;
  error?: string;
};

export type SyncStatus = {
  state: SyncState;
  lastSyncedAt: number | null;
  lastSyncedBlock: bigint | null;
  error?: string;
};

type ChatSyncOptions = {
  viewPrivKey?: `0x${string}` | null;
  spendPrivKey?: `0x${string}` | null;
  viewPubKey?: `0x${string}` | null;
  spendPubKey?: `0x${string}` | null;
  enabled?: boolean;
  onSyncComplete?: () => void;
};

type ChatSyncCacheEntry = {
  messages: ChatMessage[];
  pending: PendingAnnouncement[];
  status: SyncStatus;
  lastSyncedBlock: bigint | null;
};

const EMPTY_SYNC_STATUS: SyncStatus = {
  state: 'idle',
  lastSyncedAt: null,
  lastSyncedBlock: null,
};

const chatSyncCache = new Map<string, ChatSyncCacheEntry>();

function getChatSyncCacheKey({
  viewPubKey,
  spendPubKey,
}: {
  viewPubKey?: `0x${string}` | null;
  spendPubKey?: `0x${string}` | null;
}) {
  if (!viewPubKey || !spendPubKey) return null;
  return `${viewPubKey.toLowerCase()}:${spendPubKey.toLowerCase()}`;
}

function readChatSyncCache(cacheKey: string | null): ChatSyncCacheEntry {
  if (!cacheKey) {
    return {
      messages: [],
      pending: [],
      status: EMPTY_SYNC_STATUS,
      lastSyncedBlock: null,
    };
  }

  const cached = chatSyncCache.get(cacheKey);
  if (!cached) {
    return {
      messages: [],
      pending: [],
      status: EMPTY_SYNC_STATUS,
      lastSyncedBlock: null,
    };
  }

  return {
    messages: [...cached.messages],
    pending: [...cached.pending],
    status: { ...cached.status },
    lastSyncedBlock: cached.lastSyncedBlock,
  };
}

async function batchFetchSenders(txHashes: `0x${string}`[]): Promise<Map<string, string>> {
  const publicClient = getPublicClient(config);
  const senderMap = new Map<string, string>();

  if (!publicClient) return senderMap;

  const uniqueHashes = [...new Set(txHashes)];

  for (const hash of uniqueHashes) {
    try {
      const tx = await publicClient.getTransaction({ hash });
      if (tx?.from) senderMap.set(hash, tx.from);
    } catch {
      // Continue to next transaction
    }
  }

  return senderMap;
}

async function batchFetchBlockTimestamps(blockNumbers: bigint[]): Promise<Map<string, number>> {
  const publicClient = getPublicClient(config);
  const timestampMap = new Map<string, number>();
  if (!publicClient) return timestampMap;

  const uniqueBlockNumbers = [...new Set(blockNumbers)];

  for (const blockNumber of uniqueBlockNumbers) {
    try {
      const block = await publicClient.getBlock({ blockNumber });
      timestampMap.set(blockNumber.toString(), Number(block.timestamp) * 1000);
    } catch {
      // Continue to next block
    }
  }

  return timestampMap;
}

function buildMessageId(match: Pick<ScanMatch, 'transactionHash' | 'ephemPubKey' | 'logIndex'>, payloadHash?: string) {
  return payloadHash ?? `${match.transactionHash}-${match.logIndex ?? match.ephemPubKey}`;
}

export function useChatSync({
  viewPrivKey,
  spendPrivKey,
  viewPubKey,
  spendPubKey,
  enabled = true,
  onSyncComplete,
}: ChatSyncOptions) {
  const cacheKey = useMemo(() => getChatSyncCacheKey({ viewPubKey, spendPubKey }), [spendPubKey, viewPubKey]);
  const initialCache = useMemo(() => readChatSyncCache(cacheKey), [cacheKey]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => initialCache.messages);
  const [pending, setPending] = useState<PendingAnnouncement[]>(() => initialCache.pending);
  const [status, setStatus] = useState<SyncStatus>(() => initialCache.status);

  const messageIds = useRef(new Set<string>());
  const pendingIds = useRef(new Set<string>());
  const pendingRef = useRef<PendingAnnouncement[]>(initialCache.pending);
  const syncingRef = useRef(false);
  const lastSyncedBlockRef = useRef<bigint | null>(initialCache.lastSyncedBlock);
  const hasAutoSyncedRef = useRef(false);
  const onSyncCompleteRef = useRef(onSyncComplete);
  const activeCacheKeyRef = useRef<string | null>(cacheKey);

  useEffect(() => {
    activeCacheKeyRef.current = cacheKey;
  }, [cacheKey]);

  useEffect(() => {
    messageIds.current = new Set(messages.map((message) => message.id));
  }, [messages]);

  useEffect(() => {
    pendingIds.current = new Set(pending.map((item) => item.id));
  }, [pending]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    onSyncCompleteRef.current = onSyncComplete;
  }, [onSyncComplete]);

  const resetState = useCallback(() => {
    setMessages([]);
    setPending([]);
    setStatus(EMPTY_SYNC_STATUS);
    messageIds.current = new Set();
    pendingIds.current = new Set();
    pendingRef.current = [];
    lastSyncedBlockRef.current = null;
    hasAutoSyncedRef.current = false;
    const currentCacheKey = activeCacheKeyRef.current;
    if (currentCacheKey) {
      chatSyncCache.delete(currentCacheKey);
    }
  }, []);

  const isReady = Boolean(enabled && viewPrivKey && spendPrivKey && viewPubKey && spendPubKey);

  const upsertMessages = useCallback((items: ChatMessage[]) => {
    if (!items.length) return;
    setMessages((prev) => {
      const map = new Map(prev.map((message) => [message.id, message]));
      for (const item of items) {
        const previous = map.get(item.id);
        map.set(item.id, previous ? { ...previous, ...item } : item);
      }
      const next = Array.from(map.values()).sort(compareChatMessagesByChainAsc);
      messageIds.current = new Set(next.map((message) => message.id));
      return next;
    });
  }, []);

  const appendPending = useCallback((items: PendingAnnouncement[]) => {
    const unique = items.filter((item) => !pendingIds.current.has(item.id));
    if (!unique.length) return;

    setPending((prev) => {
      const next = [...prev, ...unique];
      pendingIds.current = new Set(next.map((item) => item.id));
      return next;
    });
  }, []);

  const replacePending = useCallback((items: PendingAnnouncement[]) => {
    setPending(items);
    pendingIds.current = new Set(items.map((item) => item.id));
  }, []);

  const addInboundMessage = useCallback(
    ({
      match,
      payloadHash,
      content,
      threadId,
      createdAt,
      sender,
      blockNumber,
      logIndex,
    }: {
      match: ScanMatch;
      payloadHash?: string;
      content: string;
      threadId: string;
      createdAt: number;
      sender?: string;
      blockNumber: bigint | null;
      logIndex: number | null;
    }) => {
      const id = buildMessageId(match, payloadHash);
      upsertMessages([
        {
          id,
          threadId,
          content,
          createdAt,
          direction: 'inbound',
          transactionHash: match.transactionHash,
          contentAvailable: true,
          payloadHash,
          sender,
          blockNumber,
          logIndex,
        },
      ]);
    },
    [upsertMessages],
  );

  const syncMatches = useCallback(
    async ({ matches, viewPriv }: { matches: ScanMatch[]; viewPriv: `0x${string}` }) => {
      const newPending: PendingAnnouncement[] = [];
      const toProcess: ScanMatch[] = [];

      for (const match of matches) {
        const payloadHash = match.decodedMetadata?.payloadHash;
        const id = buildMessageId(match, payloadHash);
        if (messageIds.current.has(id) || pendingIds.current.has(id)) continue;
        toProcess.push(match);
      }

      if (!toProcess.length) return;

      const txHashes = toProcess.map((m) => m.transactionHash);
      const senderMap = await batchFetchSenders(txHashes);
      const blockTimestampMap = await batchFetchBlockTimestamps(toProcess.map((match) => match.blockNumber));

      const blobResults = await Promise.all(
        toProcess.map(async (match) => {
          const blobHex = await fetchBlobFromBlobscan({
            txHash: match.transactionHash,
          });
          return { match, blobHex };
        }),
      );

      for (const { match, blobHex } of blobResults) {
        const payloadHash = match.decodedMetadata?.payloadHash;
        const id = buildMessageId(match, payloadHash);
        const blockNumber = match.blockNumber ?? null;
        const createdAt =
          blockNumber !== null ? (blockTimestampMap.get(blockNumber.toString()) ?? Date.now()) : Date.now();
        const logIndex = match.logIndex ?? null;
        const sender = senderMap.get(match.transactionHash);
        const baseMessage: ChatMessage = {
          id,
          threadId: 'Loading...',
          content: 'Loading encrypted payload...',
          createdAt,
          direction: 'inbound',
          transactionHash: match.transactionHash,
          contentAvailable: false,
          payloadHash,
          sender,
          blockNumber,
          logIndex,
        };

        if (!blobHex) {
          upsertMessages([baseMessage]);
          newPending.push({
            id,
            createdAt,
            blockNumber,
            logIndex,
            transactionHash: match.transactionHash,
            payloadHash,
            ephemPubKey: match.ephemPubKey,
            viewTag: match.viewTag,
            sender,
          });
          continue;
        }

        try {
          const decrypted = await decryptBlobMessage({
            blobHex: blobHex as `0x${string}`,
            viewPrivKey: viewPriv,
            ephemPubKey: match.ephemPubKey,
          });

          addInboundMessage({
            match,
            payloadHash,
            content: decrypted.content,
            threadId: decrypted.threadId || 'Untitled',
            createdAt,
            sender,
            blockNumber,
            logIndex,
          });
        } catch (error) {
          const message = toUserErrorMessage(error, 'Failed to decrypt.');
          upsertMessages([
            {
              ...baseMessage,
              threadId: 'Encrypted',
              content: 'Encrypted content (pending decryption).',
            },
          ]);
          newPending.push({
            id,
            createdAt,
            blockNumber,
            logIndex,
            transactionHash: match.transactionHash,
            payloadHash,
            ephemPubKey: match.ephemPubKey,
            viewTag: match.viewTag,
            sender,
            error: message,
          });
        }
      }

      appendPending(newPending);
    },
    [addInboundMessage, appendPending, upsertMessages],
  );

  const retryPending = useCallback(
    async ({ viewPriv }: { viewPriv: `0x${string}` }) => {
      if (!pendingRef.current.length) return;

      const senderMap = await batchFetchSenders(pendingRef.current.map((item) => item.transactionHash));

      const blobResults = await Promise.all(
        pendingRef.current.map(async (item) => {
          const blobHex = await fetchBlobFromBlobscan({
            txHash: item.transactionHash,
          });
          return { item, blobHex };
        }),
      );

      const stillPending: PendingAnnouncement[] = [];

      for (const { item, blobHex } of blobResults) {
        if (!blobHex) {
          stillPending.push(item);
          continue;
        }

        try {
          const decrypted = await decryptBlobMessage({
            blobHex: blobHex as `0x${string}`,
            viewPrivKey: viewPriv,
            ephemPubKey: item.ephemPubKey,
          });

          const sender = senderMap.get(item.transactionHash);

          upsertMessages([
            {
              id: item.id,
              threadId: decrypted.threadId || 'Untitled',
              content: decrypted.content,
              createdAt: item.createdAt,
              direction: 'inbound',
              transactionHash: item.transactionHash,
              payloadHash: item.payloadHash,
              sender,
              contentAvailable: true,
              blockNumber: item.blockNumber,
              logIndex: item.logIndex,
            },
          ]);
        } catch (error) {
          stillPending.push({
            ...item,
            error: toUserErrorMessage(error, 'Failed to decrypt.'),
          });
          upsertMessages([
            {
              id: item.id,
              threadId: 'Encrypted',
              content: 'Encrypted content (pending decryption).',
              createdAt: item.createdAt,
              direction: 'inbound',
              transactionHash: item.transactionHash,
              payloadHash: item.payloadHash,
              sender: item.sender,
              contentAvailable: false,
              blockNumber: item.blockNumber,
              logIndex: item.logIndex,
            },
          ]);
        }
      }

      replacePending(stillPending);
    },
    [replacePending, upsertMessages],
  );

  const syncNow = useCallback(async () => {
    if (!isReady) return;
    if (syncingRef.current) return;

    syncingRef.current = true;
    setStatus((prev) => ({ ...prev, state: 'syncing', error: undefined }));

    try {
      const fromBlock = lastSyncedBlockRef.current !== null ? lastSyncedBlockRef.current + 1n : 0n;
      const scan = await scanAnnouncements({
        viewPrivKey: viewPrivKey as `0x${string}`,
        spendPrivKey: spendPrivKey as `0x${string}`,
        viewPubKey: viewPubKey as `0x${string}`,
        spendPubKey: spendPubKey as `0x${string}`,
        fromBlock,
      });

      await syncMatches({
        matches: scan.matches,
        viewPriv: viewPrivKey as `0x${string}`,
      });
      await retryPending({ viewPriv: viewPrivKey as `0x${string}` });

      const latestScannedBlock = scan.logs.reduce<bigint | null>((max, log) => {
        const block = log.blockNumber ?? null;
        if (block === null) return max;
        return max === null || block > max ? block : max;
      }, lastSyncedBlockRef.current);
      lastSyncedBlockRef.current = latestScannedBlock;
      setStatus({
        state: 'idle',
        lastSyncedAt: Date.now(),
        lastSyncedBlock: latestScannedBlock,
      });
      onSyncCompleteRef.current?.();
    } catch (error) {
      const message = toUserErrorMessage(error, 'Sync failed.');
      setStatus((prev) => ({
        ...prev,
        state: 'error',
        error: message,
      }));
    } finally {
      syncingRef.current = false;
    }
  }, [isReady, retryPending, spendPrivKey, spendPubKey, syncMatches, viewPrivKey, viewPubKey]);

  useEffect(() => {
    const cached = readChatSyncCache(cacheKey);
    setMessages(cached.messages);
    setPending(cached.pending);
    setStatus(cached.status);
    pendingRef.current = cached.pending;
    messageIds.current = new Set(cached.messages.map((message) => message.id));
    pendingIds.current = new Set(cached.pending.map((item) => item.id));
    lastSyncedBlockRef.current = cached.lastSyncedBlock;
    syncingRef.current = false;
    hasAutoSyncedRef.current = false;
  }, [cacheKey]);

  useEffect(() => {
    if (!cacheKey) return;
    chatSyncCache.set(cacheKey, {
      messages,
      pending,
      status,
      lastSyncedBlock: lastSyncedBlockRef.current,
    });
  }, [cacheKey, messages, pending, status]);

  useEffect(() => {
    if (!isReady) return;
    if (hasAutoSyncedRef.current) return;

    hasAutoSyncedRef.current = true;
    syncNow();
  }, [isReady, syncNow]);

  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void syncNow();
    }, 60000);

    return () => clearInterval(interval);
  }, [isReady, syncNow]);

  return {
    messages,
    pending,
    status,
    syncNow,
    resetState,
  };
}
