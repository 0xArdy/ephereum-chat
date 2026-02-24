import { describe, expect, it } from 'vitest';
import { getMessageExpiry, isMessageExpired } from '../ttl';

describe('message ttl', () => {
  it('marks expired messages', () => {
    const createdAtMs = 1_000;
    const ttlMs = 500;
    const nowMs = 1_600;

    expect(isMessageExpired({ createdAtMs, ttlMs, nowMs })).toBe(true);
  });

  it('keeps valid messages', () => {
    const createdAtMs = 1_000;
    const ttlMs = 2_000;
    const nowMs = 1_500;

    expect(isMessageExpired({ createdAtMs, ttlMs, nowMs })).toBe(false);
  });

  it('returns null expiry when invalid', () => {
    expect(getMessageExpiry({ createdAtMs: Number.NaN, ttlMs: 1000 })).toBeNull();
    expect(getMessageExpiry({ createdAtMs: 1000, ttlMs: 0 })).toBeNull();
  });
});
