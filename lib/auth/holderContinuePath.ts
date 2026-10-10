// FILE: lib/auth/holderContinuePath.ts
// Same-origin holder return paths allowed across zkLogin OAuth (strict allowlist).

const EXACT_PATHS = new Set([
  "/cielo/verified-rate",
  "/flagship",
  "/passport",
]);

const PREFIX_PATHS = [
  "/cielo/verified-rate/",
  "/account",
  "/passport/",
];

export function normalizeHolderContinuePath(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed !== input) return null;
  if (trimmed.includes("://") || trimmed.startsWith("//") || trimmed.includes("\\")) return null;
  if (trimmed.includes("..") || trimmed.includes("#")) return null;
  if (!trimmed.startsWith("/")) return null;

  const pathOnly = trimmed.split("?")[0] ?? trimmed;
  if (EXACT_PATHS.has(pathOnly)) return pathOnly;

  for (const prefix of PREFIX_PATHS) {
    if (pathOnly === prefix.replace(/\/$/, "") || pathOnly.startsWith(prefix)) {
      return pathOnly;
    }
  }
  return null;
}

export function holderContinuePathFromWindowLocation(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeHolderContinuePath(`${window.location.pathname}${window.location.search}`);
}
