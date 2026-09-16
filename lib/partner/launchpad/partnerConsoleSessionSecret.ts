// FILE: lib/partner/launchpad/partnerConsoleSessionSecret.ts
// Domain separated secret for partner console JWTs — never reuse receipt signing material.

import { createHmac } from "node:crypto";

const DOMAIN_INFO = "abraxas:partner-console-session:v1";

/**
 * Partner console sessions use ABRAXAS_BROWSER_SESSION_SECRET only.
 * Receipt signing (ABRAXAS_SIGNING_KEY) is a separate cryptographic domain.
 * When the browser session secret is present we derive a subkey so console
 * tokens cannot be verified with the holder browser session verifier.
 */
export function resolvePartnerConsoleSessionSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET?.trim();
  if (!raw || raw.length < 16) return null;

  const derived = createHmac("sha256", raw)
    .update(DOMAIN_INFO)
    .digest();

  return new Uint8Array(derived);
}

export function isPartnerConsoleSessionConfigured(): boolean {
  return resolvePartnerConsoleSessionSecret() !== null;
}
