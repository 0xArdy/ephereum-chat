import { getPublicClient, readContract } from 'wagmi/actions';
import { config } from '../../wagmi';
import { isValidMetaAddress, normalizeMetaAddress } from './meta-address';
import type { Address } from 'viem';

export const ERC6538_REGISTRY_ADDRESS = '0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538' as Address;

export const ERC6538_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'stealthMetaAddressOf',
    stateMutability: 'view',
    inputs: [
      {
        name: 'registrant',
        type: 'address',
      },
      {
        name: 'schemeId',
        type: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bytes',
      },
    ],
  },
  {
    type: 'function',
    name: 'registerKeys',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'schemeId',
        type: 'uint256',
      },
      {
        name: 'stealthMetaAddress',
        type: 'bytes',
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'registerKeysOnBehalf',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'registrant',
        type: 'address',
      },
      {
        name: 'schemeId',
        type: 'uint256',
      },
      {
        name: 'signature',
        type: 'bytes',
      },
      {
        name: 'stealthMetaAddress',
        type: 'bytes',
      },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'StealthMetaAddressSet',
    inputs: [
      {
        name: 'registrant',
        type: 'address',
        indexed: true,
      },
      {
        name: 'schemeId',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'stealthMetaAddress',
        type: 'bytes',
        indexed: false,
      },
    ],
  },
] as const;

export async function getStealthMetaAddress({ registrant, schemeId }: { registrant: Address; schemeId: bigint }) {
  return readContract(config, {
    address: ERC6538_REGISTRY_ADDRESS,
    abi: ERC6538_REGISTRY_ABI,
    functionName: 'stealthMetaAddressOf',
    args: [registrant, schemeId],
  });
}

export async function getLatestMetaAddressFromLogs({ registrant }: { registrant: Address }) {
  const publicClient = getPublicClient(config);
  if (!publicClient) throw new Error('No public client available');

  const logs = await publicClient.getLogs({
    address: ERC6538_REGISTRY_ADDRESS,
    event: ERC6538_REGISTRY_ABI[3],
    args: {
      registrant,
    },
    fromBlock: 0n,
    toBlock: 'latest',
  });

  let latestLog = logs[0];
  for (const log of logs) {
    if (!latestLog) {
      latestLog = log;
      continue;
    }

    const currentBlock = log.blockNumber ?? 0n;
    const latestBlockNumber = latestLog.blockNumber ?? 0n;
    const currentLogIndex = log.logIndex ?? 0;
    const latestLogIndex = latestLog.logIndex ?? 0;

    if (currentBlock > latestBlockNumber || (currentBlock === latestBlockNumber && currentLogIndex > latestLogIndex)) {
      latestLog = log;
    }
  }

  if (!latestLog?.args?.stealthMetaAddress || latestLog.args.schemeId === undefined) return null;

  const normalized = normalizeMetaAddress(latestLog.args.stealthMetaAddress);
  if (!normalized || normalized === '0x' || !isValidMetaAddress(normalized)) return null;

  return {
    metaAddress: normalized,
    schemeId: latestLog.args.schemeId,
  };
}
