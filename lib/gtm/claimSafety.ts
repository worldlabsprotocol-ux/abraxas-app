// FILE: lib/gtm/claimSafety.ts
// Scan customer-facing GTM copy for prohibited claims.

import { GTM_PROHIBITED_CLAIM_PATTERNS } from "./contract";

export function scanGtmCopyForProhibitedClaims(text: string): string[] {
  return GTM_PROHIBITED_CLAIM_PATTERNS.filter((pattern) => pattern.test(text)).map(
    (pattern) => pattern.source,
  );
}

export function assertGtmCopySafe(text: string, context: string): void {
  const hits = scanGtmCopyForProhibitedClaims(text);
  if (hits.length > 0) {
    throw new Error(`prohibited_gtm_claim_in_${context}: ${hits.join(", ")}`);
  }
}
