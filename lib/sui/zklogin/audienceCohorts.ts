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

function nullIfEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function readServerCanonicalClientId(env: Record<string, string | undefined>): string | null {
  if (env === process.env) {
    return nullIfEmpty(process.env.GOOGLE_ZKLOGIN_CLIENT_ID);
  }
  return nullIfEmpty(env[ZKLOGIN_ENV_KEYS.canonicalClientId]);
}

function readPublicCanonicalClientId(env: Record<string, string | undefined>): string | null {
  if (env === process.env) {
    return nullIfEmpty(process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID);
  }
  return nullIfEmpty(env[ZKLOGIN_ENV_KEYS.canonicalClientIdPublic]);
}

function readServerLegacyClientIds(env: Record<string, string | undefined>): string[] {
  if (env === process.env) {
    return splitClientIds(process.env.GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS);
  }
  return splitClientIds(env[ZKLOGIN_ENV_KEYS.legacyClientIds]);
}

function readPublicLegacyClientId(env: Record<string, string | undefined>): string | null {
  if (env === process.env) {
    return nullIfEmpty(process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID);
  }
  return nullIfEmpty(env[ZKLOGIN_ENV_KEYS.legacyClientIdPublic]);
}

/**
 * Canonical JWT audience for server verification.
 * Prefers GOOGLE_ZKLOGIN_CLIENT_ID; falls back to NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID
 * when the server-only var is unset (OAuth client IDs are public identifiers).
 */
export function getServerCanonicalGoogleClientId(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return readServerCanonicalClientId(env) ?? readPublicCanonicalClientId(env);
}

/**
 * Legacy JWT audiences accepted by the server.
 * When GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS is unset, falls back to the public legacy
 * client id so production cannot launch legacy OAuth with a mismatched server allowlist.
 * When the server list is non-empty, it is authoritative (explicit operator allowlist).
 */
export function parseServerLegacyGoogleClientIds(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const explicit = readServerLegacyClientIds(env);
  if (explicit.length > 0) return explicit;

  const publicLegacy = readPublicLegacyClientId(env);
  return publicLegacy ? [publicLegacy] : [];
}

export function getPublicLegacyGoogleClientId(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return readPublicLegacyClientId(env);
}

export function getPublicCanonicalGoogleClientId(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return readPublicCanonicalClientId(env);
}

/**
 * Browser-launchable legacy recovery on the server: public legacy client id is set
 * AND included in the effective server JWT allowlist.
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

export function describeZkLoginAudienceConfiguration(
  env: Record<string, string | undefined> = process.env,
): {
  canonicalConfigured: boolean;
  legacyRecoveryAvailable: boolean;
  trustedAudienceCount: number;
  usesPublicCanonicalFallback: boolean;
  usesPublicLegacyFallback: boolean;
} {
  const explicitCanonical = readServerCanonicalClientId(env);
  const explicitLegacy = readServerLegacyClientIds(env);
  const publicLegacy = getPublicLegacyGoogleClientId(env);

  return {
    canonicalConfigured: Boolean(getServerCanonicalGoogleClientId(env)),
    legacyRecoveryAvailable: isBrowserLegacyRecoveryAvailable(env),
    trustedAudienceCount: getTrustedGoogleAudiences(env).length,
    usesPublicCanonicalFallback: !explicitCanonical && Boolean(readPublicCanonicalClientId(env)),
    usesPublicLegacyFallback: explicitLegacy.length === 0 && Boolean(publicLegacy),
  };
}
