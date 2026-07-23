// FILE: lib/env/parseEnvBool.ts
// Tolerant env boolean parsing — Vercel users often set True, 1, yes.

export function parseEnvBool(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined || value === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}
