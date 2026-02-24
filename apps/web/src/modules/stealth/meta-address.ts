export type MetaAddress = {
  scheme: number;
  spendPubKey: `0x${string}`;
  viewPubKey: `0x${string}`;
};

export function encodeMetaAddress({ metaAddress }: { metaAddress: MetaAddress }) {
  if (metaAddress.scheme !== 0x02) throw new Error('Unsupported scheme');

  const hex = [
    metaAddress.scheme.toString(16).padStart(2, '0'),
    metaAddress.spendPubKey.slice(2),
    metaAddress.viewPubKey.slice(2),
  ].join('');

  return `0x${hex}`;
}

export function parseMetaAddress({ raw }: { raw: string }): MetaAddress {
  if (!/^0x[0-9a-f]{134}$/i.test(raw)) throw new Error('Invalid meta-address length');

  const scheme = Number.parseInt(raw.slice(2, 4), 16);
  const spendPubKey = `0x${raw.slice(4, 4 + 66)}` as `0x${string}`;
  const viewPubKey = `0x${raw.slice(4 + 66)}` as `0x${string}`;

  return { scheme, spendPubKey, viewPubKey };
}

export function normalizeMetaAddress(value: string) {
  if (value.startsWith('st:eth:')) return value.slice('st:eth:'.length);
  return value;
}

export function isValidMetaAddress(value: string) {
  return /^0x[0-9a-f]{134}$/i.test(value);
}
