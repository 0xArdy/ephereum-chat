/**
 * Blobscan API client for fetching EIP-4844 blob data.
 *
 * Blobs are stored on the beacon chain (consensus layer) and are not
 * accessible via standard Ethereum JSON-RPC. Blobscan indexes them
 * and provides a REST API.
 *
 * Note: Browser CORS may block direct API calls. If that happens,
 * users can manually copy blob data from the Blobscan website.
 */

import { bytesToHex } from '../../utils';

const BLOBSCAN_API_BASE = 'https://api.sepolia.blobscan.com';

/**
 * Helper to fetch blob data from a URI
 * Uses Vite proxy for Google Cloud Storage to bypass CORS
 */
async function fetchFromUri(uri: string): Promise<`0x${string}` | null> {
  try {
    // Use Vite proxy for Google Cloud Storage URLs to bypass CORS
    let fetchUrl = uri;
    if (uri.startsWith('https://storage.googleapis.com/')) {
      fetchUrl = uri.replace('https://storage.googleapis.com', '/blobscan-storage');
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      return null;
    }

    // The .bin file contains raw binary blob data, convert to hex
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const hex = bytesToHex(bytes);
    return hex;
  } catch {
    return null;
  }
}

type BlobscanTransaction = {
  hash: string;
  blockNumber: number;
  blobs: Array<{
    versionedHash: string;
    commitment?: string;
    proof?: string;
    data?: string;
    dataStorageReferences?: BlobStorageReference[];
  }>;
};

type BlobStorageReference = {
  storage: string;
  url: string;
};

type BlobscanBlob = {
  versionedHash: string;
  commitment: string;
  proof: string;
  size: number;
  usageSize: number;
  data?: string;
  dataUri?: string;
  dataStorageReferences?: BlobStorageReference[];
};

/**
 * Fetch blob data for a transaction from Blobscan API.
 * Returns the first blob's data as hex string.
 */
export async function fetchBlobFromBlobscan({ txHash }: { txHash: string }): Promise<string | null> {
  try {
    // First, get the transaction to find blob hashes
    const txResponse = await fetch(`${BLOBSCAN_API_BASE}/transactions/${txHash}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!txResponse.ok) {
      return null;
    }

    const txData = (await txResponse.json()) as BlobscanTransaction;

    if (!txData.blobs || txData.blobs.length === 0) {
      return null;
    }

    // Get the first blob's data
    const firstBlob = txData.blobs[0];

    // Data might be included inline
    if (firstBlob.data) {
      return firstBlob.data.startsWith('0x') ? firstBlob.data : `0x${firstBlob.data}`;
    }

    // Try dataStorageReferences from transaction response
    if (firstBlob.dataStorageReferences && firstBlob.dataStorageReferences.length > 0) {
      for (const ref of firstBlob.dataStorageReferences) {
        const fetched = await fetchFromUri(ref.url);
        if (fetched) return fetched;
      }
    }

    // If data is not inline, fetch the blob separately using versionedHash
    const blobHash = firstBlob.versionedHash;
    if (!blobHash) {
      return null;
    }

    const blobResponse = await fetch(`${BLOBSCAN_API_BASE}/blobs/${blobHash}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!blobResponse.ok) {
      return null;
    }

    const blobData = (await blobResponse.json()) as BlobscanBlob;

    // Try to get data directly first
    if (blobData.data) {
      return blobData.data.startsWith('0x') ? blobData.data : `0x${blobData.data}`;
    }

    // If data is stored externally, fetch from dataUri
    if (blobData.dataUri) {
      const fetched = await fetchFromUri(blobData.dataUri);
      if (fetched) return fetched;
    }

    // Handle dataStorageReferences (Blobscan's external storage like Google Cloud)
    if (blobData.dataStorageReferences && blobData.dataStorageReferences.length > 0) {
      for (const ref of blobData.dataStorageReferences) {
        const fetched = await fetchFromUri(ref.url);
        if (fetched) return fetched;
      }
    }

    return null;
  } catch {
    return null;
  }
}
