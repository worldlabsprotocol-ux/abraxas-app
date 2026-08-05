// FILE: lib/credentials/abraxasIssuer.ts
// Canonical Abraxas credential issuer resolution and trusted verification issuers.

import { decodeJwt } from "jose";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * Historical production issuer used before canonical-origin migration.
 * Verification-only allowlist entry — new credentials must not use this issuer.
 */
export const LEGACY_TRUSTED_ABRAXAS_ISSUER = "https://abraxas-app.vercel.app";

/**
 * Resolve the issuer stamped on newly issued credential JWTs and VCs.
 * Honors `ABRAXAS_ISSUER_URL` for local/preview; otherwise canonical `SITE_URL`.
 */
export function resolveAbraxasCredentialIssuer(): string {
  const fromEnv = process.env.ABRAXAS_ISSUER_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return SITE_URL;
}

/**
 * Issuer values accepted during credential JWT verification.
 * Includes the active configured issuer plus the documented legacy issuer.
 */
export function trustedAbraxasCredentialIssuers(): string[] {
  return Array.from(
    new Set([resolveAbraxasCredentialIssuer(), LEGACY_TRUSTED_ABRAXAS_ISSUER]),
  );
}

/** Read `iss` from a stored credential JWT without verifying the signature. */
export function extractIssuerFromCredentialJwt(credentialJwt: string): string | null {
  try {
    const payload = decodeJwt(credentialJwt);
    return typeof payload.iss === "string" ? payload.iss : null;
  } catch {
    return null;
  }
}
