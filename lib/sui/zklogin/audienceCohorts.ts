// FILE: lib/sui/zklogin/audienceCohorts.ts
// Server-side trusted Google OAuth audience cohorts for zkLogin JWT verification.

export type ZkLoginLoginMode = "canonical" | "legacy_recovery";

export type ZkLoginAudienceCohort = "canonical" | "legacy" | "untrusted";

export const ZKLOGIN_ENV_KEYS = {
  canonicalClientId: "GOOGLE_ZKLOGIN_CLIENT_ID",
  canonicalClientIdPublic: "NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID",
  legacyClientIds: "GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS",
  legacyClientIdPublic: "NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID",
} as const;

function splitClientIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);
}

function readServerCanonicalClientId(env: Record<string, string | undefined>): string | null {
  if (env === process.env) {
    const value = process.env.GOOGLE_ZKLOGIN_CLIENT_ID;
    const trimmed = value?.trim();
    return trimmed || null;
  }
  return env[ZKLOGIN_ENV_KEYS.canonicalClientId]?.trim() ?? null;
}

function readServerLegacyClientIds(env: Record<string, string | undefined>): string[] {
  if (env === process.env) {
    return splitClientIds(process.env.GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS);
  }
  return splitClientIds(env[ZKLOGIN_ENV_KEYS.legacyClientIds]);
}

function readPublicLegacyClientId(env: Record<string, string | undefined>): string | null {
  if (env === process.env) {
    const value = process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID;
    const trimmed = value?.trim();
    return trimmed || null;
  }
  return env[ZKLOGIN_ENV_KEYS.legacyClientIdPublic]?.trim() ?? null;
}

/** Server-only canonical client id (GOOGLE_ZKLOGIN_CLIENT_ID). */
export function getServerCanonicalGoogleClientId(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return readServerCanonicalClientId(env);
}

/** Server JWT allowlist — GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS only. */
export function parseServerLegacyGoogleClientIds(
  env: Record<string, string | undefined> = process.env,
): string[] {
  return readServerLegacyClientIds(env);
}

export function getPublicLegacyGoogleClientId(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return readPublicLegacyClientId(env);
}

/**
 * Browser-launchable legacy recovery on the server: public legacy client id is set
 * AND explicitly included in GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS.
 */
export function isBrowserLegacyRecoveryAvailable(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const publicLegacy = getPublicLegacyGoogleClientId(env);
  if (!publicLegacy) return false;
  return parseServerLegacyGoogleClientIds(env).includes(publicLegacy);
}

export function getTrustedGoogleAudiences(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const canonical = getServerCanonicalGoogleClientId(env);
  const legacy = parseServerLegacyGoogleClientIds(env);
  return Array.from(new Set([canonical, ...legacy].filter((id): id is string => Boolean(id))));
}

export function isTrustedGoogleAudience(
  aud: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return getTrustedGoogleAudiences(env).includes(aud);
}

export function classifyGoogleAudience(
  aud: string,
  env: Record<string, string | undefined> = process.env,
): ZkLoginAudienceCohort {
  const canonical = getServerCanonicalGoogleClientId(env);
  if (canonical && aud === canonical) return "canonical";
  if (parseServerLegacyGoogleClientIds(env).includes(aud)) return "legacy";
  return "untrusted";
}

/** @deprecated Use isBrowserLegacyRecoveryAvailable for server recovery hints. */
export function isLegacyRecoveryConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return isBrowserLegacyRecoveryAvailable(env);
}

export function normalizeJwtAudience(aud: string | string[] | undefined): string | null {
  if (typeof aud === "string" && aud.trim()) return aud.trim();
  if (Array.isArray(aud)) {
    const first = aud.find(item => typeof item === "string" && item.trim());
    return first?.trim() ?? null;
  }
  return null;
}
