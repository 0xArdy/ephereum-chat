import { getPublicClient } from 'wagmi/actions';
import { decodeAnnouncementMetadata } from '../modules/messages/metadata';
import { MESSAGE_ENVELOPE_ABI, announcerConfig } from '../modules/stealth/announcer';
import { config } from '../wagmi';
import type { Address } from 'viem';

export type ChatMessage = {
  id: string;
  threadId: string;
  content: string;
  createdAt: number;
  direction: 'inbound' | 'outbound';
  transactionHash: `0x${string}`;
  recipient?: string;
  sender?: string;
  contentAvailable?: boolean;
  payloadHash?: string;
  blockNumber?: bigint | null;
  logIndex?: number | null;
};

export function compareChatMessagesByChainDesc(a: ChatMessage, b: ChatMessage) {
  const blockOrder = compareNullableBigIntDesc(a.blockNumber, b.blockNumber);
  if (blockOrder !== 0) return blockOrder;

  const logOrder = compareNullableNumberDesc(a.logIndex, b.logIndex);
  if (logOrder !== 0) return logOrder;

  return b.createdAt - a.createdAt;
}

export function compareChatMessagesByChainAsc(a: ChatMessage, b: ChatMessage) {
  return -compareChatMessagesByChainDesc(a, b);
}

export async function getSentMessagesFromLogs({
  senderAddresses,
  fromBlock = 0n,
}: {
  senderAddresses: Address[];
  fromBlock?: bigint;
}): Promise<{ messages: ChatMessage[]; latestBlock: bigint | null }> {
  const publicClient = getPublicClient(config);
  if (!publicClient) throw new Error('No public client available');

  const senderSet = new Set(senderAddresses.map((addr) => addr.toLowerCase()));

  const logs = await publicClient.getLogs({
    address: announcerConfig.address,
    event: MESSAGE_ENVELOPE_ABI[0],
    fromBlock,
    toBlock: 'latest',
  });

  const map = new Map<string, ChatMessage>();

  if (!logs.length) return { messages: [], latestBlock: null };

  const latestBlock = logs.reduce<bigint | null>((max, log) => {
    const block = log.blockNumber ?? null;
    if (block === null) return max;
    return max === null || block > max ? block : max;
  }, null);

  const txHashes = [...new Set(logs.map((log) => log.transactionHash).filter(Boolean))] as `0x${string}`[];
  const blockNumbers = [...new Set(logs.map((log) => log.blockNumber).filter((value) => value != null))] as bigint[];

  const txMap = new Map<string, string>();
  const blockTimestampMap = new Map<string, number>();

  for (const hash of txHashes) {
    try {
      const tx = await publicClient.getTransaction({ hash });
      if (tx?.from) txMap.set(hash, tx.from);
    } catch {
      // Continue to next transaction
    }
  }

  for (const blockNumber of blockNumbers) {
    try {
      const block = await publicClient.getBlock({ blockNumber });
      blockTimestampMap.set(blockNumber.toString(), Number(block.timestamp) * 1000);
    } catch {
      // Continue to next block
    }
  }

  for (const log of logs) {
    if (!log.transactionHash) continue;

    const txSender = txMap.get(log.transactionHash);
    if (!txSender || !senderSet.has(txSender.toLowerCase())) continue;

    const recipient = log.args?.recipientStealthAddress as `0x${string}` | undefined;
    const metadataHex = log.args?.metadata as `0x${string}` | undefined;
    let decoded = null as ReturnType<typeof decodeAnnouncementMetadata>;
    if (metadataHex) {
      decoded = decodeAnnouncementMetadata({ hex: metadataHex });
    }

    const payloadHash = decoded?.payloadHash;
    const id = payloadHash ?? `${log.transactionHash}-${log.logIndex ?? recipient ?? 'sent'}`;
    const chainBlockNumber = log.blockNumber ?? null;
    const createdAt =
      chainBlockNumber !== null ? (blockTimestampMap.get(chainBlockNumber.toString()) ?? Date.now()) : Date.now();
    const threadId = payloadHash ? `enc:${payloadHash}` : 'Encrypted';
    const message: ChatMessage = {
      id,
      threadId,
      content: 'Encrypted content (recipient-only).',
      createdAt,
      direction: 'outbound',
      transactionHash: log.transactionHash as `0x${string}`,
      recipient,
      sender: txSender,
      contentAvailable: false,
      payloadHash,
      blockNumber: chainBlockNumber,
      logIndex: log.logIndex ?? null,
    };

    map.set(id, message);
  }

  return {
    messages: Array.from(map.values()).sort(compareChatMessagesByChainDesc),
    latestBlock,
  };
}

function compareNullableBigIntDesc(a?: bigint | null, b?: bigint | null) {
  if (a != null && b != null) {
    if (a === b) return 0;
    return a > b ? -1 : 1;
  }
  if (a != null) return -1;
  if (b != null) return 1;
  return 0;
}

function compareNullableNumberDesc(a?: number | null, b?: number | null) {
  if (a != null && b != null) return b - a;
  if (a != null) return -1;
  if (b != null) return 1;
  return 0;
}
