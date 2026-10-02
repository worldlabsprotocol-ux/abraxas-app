// FILE: lib/provenance/expectedContentHash.ts
// Validate expected artifact fingerprint params for provenance partner flows.

const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

export function normalizeExpectedContentHash(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (!trimmed) return null;
  return SHA256_HEX_RE.test(trimmed) ? trimmed : null;
}

export function isValidExpectedContentHash(value: string | null | undefined): boolean {
  return normalizeExpectedContentHash(value) !== null;
}
