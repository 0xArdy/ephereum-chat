import * as secp from '@noble/secp256k1';
import { keccak256 } from 'viem';
import { getPublicClient } from 'wagmi/actions';
import { config } from '../../wagmi';
import { decodeAnnouncementMetadata } from '../messages/metadata';
import { MESSAGE_ENVELOPE_ABI } from './announcer';
import { ANNOUNCER_SINGLETON } from './constants';
import { buildMetaAddress, recoverStealthPrivKey } from './stealth';

export type ScanMatch = {
  stealthAddress: `0x${string}`;
  stealthPrivKey: `0x${string}`;
  ephemPubKey: `0x${string}`;
  viewTag: `0x${string}`;
  metadata: `0x${string}`;
  decodedMetadata: ReturnType<typeof decodeAnnouncementMetadata>;
  blockNumber: bigint;
  logIndex: number | null;
  transactionHash: `0x${string}`;
  metaAddress: string;
};

export async function scanAnnouncements({
  viewPrivKey,
  spendPrivKey,
  viewPubKey,
  spendPubKey,
  fromBlock = 0n,
}: {
  viewPrivKey: `0x${string}`;
  spendPrivKey: `0x${string}`;
  viewPubKey: `0x${string}`;
  spendPubKey: `0x${string}`;
  fromBlock?: bigint;
}) {
  const publicClient = getPublicClient(config);
  if (!publicClient) throw new Error('No public client available');

  const logs = await publicClient.getLogs({
    address: ANNOUNCER_SINGLETON,
    event: MESSAGE_ENVELOPE_ABI[0],
    fromBlock,
    toBlock: 'latest',
  });

  const metaAddress = buildMetaAddress({ viewPubKey, spendPubKey });

  const matches: ScanMatch[] = [];
  const debugInfo: Array<{
    txHash: string;
    recipientAddress: string;
    ephemPubKey: string;
    viewTag: string;
    expectedViewTag?: string;
    error?: string;
    recoveredAddress?: string;
  }> = [];

  for (const log of logs) {
    const ephemPubKey = log.args.ephemeralPubKey;
    const viewTag = log.args.viewTag;
    const metadataHex = log.args.metadata;
    const recipientAddress = log.args.recipientStealthAddress;

    if (!ephemPubKey || !viewTag || !metadataHex || !recipientAddress) {
      debugInfo.push({
        txHash: log.transactionHash,
        recipientAddress: String(recipientAddress),
        ephemPubKey: String(ephemPubKey),
        viewTag: String(viewTag),
        error: 'Missing required args',
      });
      continue;
    }

    const appMetadata = decodeAnnouncementMetadata({ hex: metadataHex });

    // Pre-compute expected view tag for debugging
    let expectedViewTag: string | undefined;
    try {
      const viewPriv = BigInt(viewPrivKey);
      const ephemPubPoint = secp.Point.fromHex(ephemPubKey.slice(2));
      const shared = ephemPubPoint.multiply(viewPriv).toBytes(true).slice(1);
      expectedViewTag = `0x${keccak256(shared).slice(2, 4)}`;
    } catch {
      // Ignore errors in debug computation
    }

    try {
      const recovered = recoverStealthPrivKey({
        viewPrivKey,
        spendPrivKey,
        ephemPubKey,
        viewTag,
      });

      // Verify the recovered stealth address matches the announced one
      if (recovered.stealthAddress.toLowerCase() !== recipientAddress.toLowerCase()) {
        debugInfo.push({
          txHash: log.transactionHash,
          recipientAddress,
          ephemPubKey,
          viewTag,
          expectedViewTag,
          error: 'Address mismatch',
          recoveredAddress: recovered.stealthAddress,
        });
        continue;
      }

      matches.push({
        stealthAddress: recovered.stealthAddress,
        stealthPrivKey: recovered.stealthPrivKey,
        ephemPubKey,
        viewTag,
        metadata: metadataHex,
        decodedMetadata: appMetadata,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex ?? null,
        transactionHash: log.transactionHash,
        metaAddress,
      });
    } catch (err) {
      // View tag mismatch - not for us
      debugInfo.push({
        txHash: log.transactionHash,
        recipientAddress,
        ephemPubKey,
        viewTag,
        expectedViewTag,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return { logs, matches, debugInfo };
}
