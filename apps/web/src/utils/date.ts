export function formatRelativeTime(timestamp: number): string {
  const delta = Date.now() - timestamp;
  if (delta < 10000) return 'just now';
  if (delta < 60000) return `${Math.round(delta / 1000)}s ago`;
  if (delta < 3600000) return `${Math.round(delta / 60000)}m ago`;
  if (delta < 86400000) return `${Math.round(delta / 3600000)}h ago`;
  return `${Math.round(delta / 86400000)}d ago`;
}

export function formatShortTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

export function formatExpiryLabel({ expiresAt }: { expiresAt: number | null }): string {
  if (!expiresAt) return 'Expiry unknown';
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return 'Expired — blob pruned';

  return `Expires in ${formatDuration(remaining)}`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
