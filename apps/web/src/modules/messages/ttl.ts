export function isMessageExpired({
  createdAtMs,
  ttlMs,
  nowMs = Date.now(),
}: {
  createdAtMs: number;
  ttlMs: number;
  nowMs?: number;
}) {
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(ttlMs)) return true;
  if (ttlMs <= 0) return true;

  return nowMs >= createdAtMs + ttlMs;
}

export function getMessageExpiry({ createdAtMs, ttlMs }: { createdAtMs: number; ttlMs: number }) {
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(ttlMs)) return null;
  if (ttlMs <= 0) return null;

  return createdAtMs + ttlMs;
}
