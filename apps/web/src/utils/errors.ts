type ErrorHint = {
  test: RegExp;
  message: string;
};

const ERROR_HINTS: ErrorHint[] = [
  { test: /user rejected|rejected request|denied transaction signature/i, message: 'Request was cancelled.' },
  { test: /insufficient funds/i, message: 'Insufficient balance to complete this transaction.' },
  { test: /invalid password/i, message: 'Invalid password.' },
  { test: /failed to fetch|network/i, message: 'Network error. Please check your RPC connection and try again.' },
];

export function toUserErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const raw = error.message?.trim();
  if (!raw) return fallback;

  for (const hint of ERROR_HINTS) {
    if (hint.test.test(raw)) return hint.message;
  }

  return fallback;
}
