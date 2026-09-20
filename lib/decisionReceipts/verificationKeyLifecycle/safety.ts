// FILE: lib/decisionReceipts/verificationKeyLifecycle/safety.ts

export function assertNoPrivateReceiptKeyMaterial(payload: unknown): string[] {
  const leaks: string[] = [];
  const blob = JSON.stringify(payload ?? null);
  const lower = blob.toLowerCase();
  const needles = [
    '"d"',
    "private_key",
    "abraxas_signing_key",
    "seed phrase",
    "secretkey",
  ];
  for (const needle of needles) {
    if (lower.includes(needle)) leaks.push(needle);
  }
  return leaks;
}

export function rejectReceiptKeyClientOverride(
  source: URLSearchParams | Record<string, unknown> | null | undefined,
  allowed: readonly string[],
): boolean {
  if (!source) return false;
  const keys = source instanceof URLSearchParams
    ? Array.from(source.keys())
    : Object.keys(source);
  return keys.some((key) => !(allowed as readonly string[]).includes(key));
}
