import { keccak256, toHex } from 'viem';

export function encodeBlobPayload({ ciphertext, nonce }: { ciphertext: Uint8Array; nonce: Uint8Array }) {
  const combined = concatBytes({ parts: [nonce, ciphertext] });
  return toHex(combined);
}

export function decodeBlobPayload({ hex }: { hex: `0x${string}` }) {
  const bytes = hexToBytes({ hex });
  const nonce = bytes.slice(0, 24);
  const ciphertext = bytes.slice(24);

  return { nonce, ciphertext };
}

export function getBlobPayloadHash({ hex }: { hex: `0x${string}` }) {
  return keccak256(hex);
}

function concatBytes({ parts }: { parts: Uint8Array[] }) {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });

  return result;
}

function hexToBytes({ hex }: { hex: `0x${string}` }) {
  const stripped = hex.slice(2);
  const bytes = new Uint8Array(stripped.length / 2);
  for (let index = 0; index < stripped.length; index += 2)
    bytes[index / 2] = Number.parseInt(stripped.slice(index, index + 2), 16);

  return bytes;
}
