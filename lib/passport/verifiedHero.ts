// FILE: lib/passport/verifiedHero.ts
// Verified-state hero copy and visibility helpers (no PII).

import type { IdentityUiState } from "@/lib/passport/identityUiState";

export const VERIFIED_HERO_HEADLINE = "You're verified";
export const VERIFIED_HERO_SUPPORTING =
  "Your Abraxas identity proof is ready to use with compatible applications.";
export const VERIFIED_HERO_PRIVACY =
  "Partners receive only the proof required by their policy — not your ID or selfie files.";

export function shouldShowVerifiedHero(
  identityUi: IdentityUiState,
  hasCredential: boolean,
): boolean {
  return identityUi === "verified" && hasCredential;
}

export function formatCredentialExpiration(
  iso: string | undefined | null,
  now = new Date(),
): string | null {
  if (!iso) return null;
  const exp = new Date(iso);
  if (Number.isNaN(exp.getTime())) return null;
  if (exp <= now) return "Expired";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(exp);
}

export function formatAssuranceLabel(level: string): string {
  return `Assurance ${level}`;
}

/** Safe public fields for verified hero — excludes JWT, document images, internal IDs. */
export function buildVerifiedHeroPublicState(input: {
  assuranceLevel: string;
  expiresAt?: string | null;
}): {
  assuranceLabel: string;
  statusLabel: string;
  expirationLabel: string | null;
} {
  const expiration = formatCredentialExpiration(input.expiresAt);
  return {
    assuranceLabel: formatAssuranceLabel(input.assuranceLevel),
    statusLabel: "Verified",
    expirationLabel: expiration ? `Valid until ${expiration}` : null,
  };
}
