// FILE: lib/sui/zklogin/clientEnv.ts
// Client-bundle OAuth env — direct static NEXT_PUBLIC references only.
// Next.js inlines public env vars only when accessed statically, not via process.env[key].

import type { ZkLoginLoginMode } from "@/lib/sui/zklogin/audienceCohorts";

/**
 * Canonical Google OAuth client id embedded in the browser bundle.
 * Must use a direct property access so Vercel/Next can inline the value.
 */
export function getClientCanonicalGoogleClientId(): string | null {
  const value = process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID;
  const trimmed = value?.trim();
  return trimmed || null;
}

/**
 * Legacy Google OAuth client id for Existing account sign-in (browser OAuth redirect).
 */
export function getClientLegacyGoogleClientId(): string | null {
  const value = process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID;
  const trimmed = value?.trim();
  return trimmed || null;
}

export function isClientZkLoginConfigured(): boolean {
  return getClientCanonicalGoogleClientId() !== null;
}

/** True when the public legacy client id is present in the browser bundle. */
export function isClientLegacyRecoveryConfigured(): boolean {
  return getClientLegacyGoogleClientId() !== null;
}

export function resolveClientOAuthClientIdForMode(mode: ZkLoginLoginMode): string | null {
  if (mode === "legacy_recovery") {
    return getClientLegacyGoogleClientId();
  }
  return getClientCanonicalGoogleClientId();
}
