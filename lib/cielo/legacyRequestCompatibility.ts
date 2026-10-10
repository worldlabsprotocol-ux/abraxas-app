// FILE: lib/cielo/legacyRequestCompatibility.ts
// Read-only compatibility notes for historical Cielo verified-rate rows (no schema rewrites).

/** Public reference prefix unchanged since migration 026. */
export const CIELO_VERIFIED_RATE_REF_PREFIX = "CVR-";

/** Operator statuses persisted in cielo_verified_rate_requests — do not rename in #502. */
export const LEGACY_VERIFIED_RATE_STATUS_READABLE = [
  "request_received",
  "pending_review",
  "eligible",
  "operator_confirmed",
  "declined",
  "not_eligible",
] as const;

export function isLegacyVerifiedRatePublicRef(ref: string): boolean {
  return ref.startsWith(CIELO_VERIFIED_RATE_REF_PREFIX);
}

/**
 * Modernization keeps legacy request rows addressable by public_reference and consent/decision ids.
 * New funnel metadata is additive (partner_integration_events), not a backfill of PII.
 */
export function legacyRequestMigrationGuidance(): string[] {
  return [
    "Do not migrate cielo_verified_rate_requests to a new table without operator-approved cutover.",
    "Receipt trust uses decision_receipts linked via verification_decision_id from consent responses.",
    "Historical audit events (cielo.consent_granted, cielo.policy_evaluated) remain authoritative.",
    "Fixture-driven UI states must not overwrite production or staging request rows.",
  ];
}
