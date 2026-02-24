declare module 'kzg-wasm' {
  import type { Kzg } from 'viem';

  export function loadKZG(): Promise<Kzg>;
}
