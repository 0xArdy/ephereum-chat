import { loadKZG } from 'kzg-wasm';
import { toHex, toBytes, type Kzg } from 'viem';

type HexKzgLike = {
  blobToKZGCommitment?: (blob: string) => string;
  blobToKzgCommitment?: (blob: string) => string;
  computeBlobKZGProof?: (blob: string, commitment: string) => string;
  computeBlobKzgProof?: (blob: string, commitment: string) => string;
  computeBlobProof?: (blob: string, commitment: string) => string;
};

let kzgInstance: Kzg | null = null;
let kzgPromise: Promise<Kzg> | null = null;

export async function getKzg() {
  if (kzgInstance) return kzgInstance;
  if (kzgPromise) return kzgPromise;

  kzgPromise = loadKZG()
    .then((rawKzg) => {
      const kzgWasm = rawKzg as unknown as HexKzgLike;
      const blobToKzgCommitmentHex = kzgWasm.blobToKZGCommitment ?? kzgWasm.blobToKzgCommitment;
      const computeBlobKzgProofHex =
        kzgWasm.computeBlobKZGProof ?? kzgWasm.computeBlobKzgProof ?? kzgWasm.computeBlobProof;

      if (!blobToKzgCommitmentHex || !computeBlobKzgProofHex) {
        throw new Error('Loaded KZG implementation is missing required methods.');
      }

      // `kzg-wasm` uses hex string inputs/outputs, while viem expects Uint8Array.
      // Adapt the interface so local account blob signing works correctly.
      kzgInstance = {
        blobToKzgCommitment(blob) {
          const commitmentHex = blobToKzgCommitmentHex(toHex(blob));
          return toBytes(commitmentHex);
        },
        computeBlobKzgProof(blob, commitment) {
          const proofHex = computeBlobKzgProofHex(toHex(blob), toHex(commitment));
          return toBytes(proofHex);
        },
      };
      return kzgInstance;
    })
    .catch((error) => {
      kzgPromise = null;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load KZG: ${message}`);
    });

  return kzgPromise;
}
