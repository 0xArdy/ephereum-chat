import { encodeFunctionData } from 'viem';
import { MESSAGE_ENVELOPE_REGISTRY } from './constants';

/**
 * MessageEnvelopeRegistry ABI - our custom contract for Ephereum Chat.
 * Designed to work with EIP-4844 blobs in the same transaction.
 */
export const MESSAGE_ENVELOPE_ABI = [
  {
    type: 'event',
    name: 'MessageEnvelope',
    inputs: [
      { name: 'recipientStealthAddress', type: 'address', indexed: true },
      { name: 'ephemeralPubKey', type: 'bytes', indexed: false },
      { name: 'viewTag', type: 'bytes1', indexed: false },
      { name: 'metadata', type: 'bytes', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'announce',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipientStealthAddress', type: 'address' },
      { name: 'ephemeralPubKey', type: 'bytes' },
      { name: 'viewTag', type: 'bytes1' },
      { name: 'metadata', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export const announcerConfig = {
  address: MESSAGE_ENVELOPE_REGISTRY,
  abi: MESSAGE_ENVELOPE_ABI,
} as const;

/**
 * Encode calldata for the MessageEnvelopeRegistry announce function.
 */
export function encodeAnnouncementCalldata({
  stealthAddress,
  ephemPubKey,
  viewTag,
  metadata = '0x',
}: {
  stealthAddress: `0x${string}`;
  ephemPubKey: `0x${string}`;
  viewTag: `0x${string}`;
  metadata?: `0x${string}`;
}) {
  return encodeFunctionData({
    abi: MESSAGE_ENVELOPE_ABI,
    functionName: 'announce',
    args: [stealthAddress, ephemPubKey, viewTag, metadata],
  });
}
