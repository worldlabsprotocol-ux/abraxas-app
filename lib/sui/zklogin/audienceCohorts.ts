// FILE: lib/sui/zklogin/audienceCohorts.ts
// Trusted Google OAuth audience cohorts for zkLogin (canonical + configured legacy).

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

export function getCanonicalGoogleClientId(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return (
    env[ZKLOGIN_ENV_KEYS.canonicalClientId]?.trim()
    ?? env[ZKLOGIN_ENV_KEYS.canonicalClientIdPublic]?.trim()
    ?? null
  );
}

export function parseLegacyGoogleClientIds(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const fromServer = splitClientIds(env[ZKLOGIN_ENV_KEYS.legacyClientIds]);
  const fromPublic = env[ZKLOGIN_ENV_KEYS.legacyClientIdPublic]?.trim();
  const combined = fromPublic ? [...fromServer, fromPublic] : fromServer;
  return Array.from(new Set(combined));
}

export function getTrustedGoogleAudiences(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const canonical = getCanonicalGoogleClientId(env);
  const legacy = parseLegacyGoogleClientIds(env);
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
  const canonical = getCanonicalGoogleClientId(env);
  if (canonical && aud === canonical) return "canonical";
  if (parseLegacyGoogleClientIds(env).includes(aud)) return "legacy";
  return "untrusted";
}

export function isLegacyRecoveryConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return parseLegacyGoogleClientIds(env).length > 0;
}

/** Client-visible legacy recovery availability (public legacy client id only). */
export function isLegacyRecoveryConfiguredClient(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env[ZKLOGIN_ENV_KEYS.legacyClientIdPublic]?.trim());
}

export function resolveOAuthClientIdForMode(
  mode: ZkLoginLoginMode,
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (mode === "legacy_recovery") {
    return (
      env[ZKLOGIN_ENV_KEYS.legacyClientIdPublic]?.trim()
      ?? parseLegacyGoogleClientIds(env)[0]
      ?? null
    );
  }
  return env[ZKLOGIN_ENV_KEYS.canonicalClientIdPublic]?.trim()
    ?? getCanonicalGoogleClientId(env);
}

export function normalizeJwtAudience(aud: string | string[] | undefined): string | null {
  if (typeof aud === "string" && aud.trim()) return aud.trim();
  if (Array.isArray(aud)) {
    const first = aud.find(item => typeof item === "string" && item.trim());
    return first?.trim() ?? null;
  }
  return null;
}
