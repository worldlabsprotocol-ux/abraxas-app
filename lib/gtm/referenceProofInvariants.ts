// FILE: lib/gtm/referenceProofInvariants.ts
// Canonical reference-harness invariants for GTM marketing surfaces.
// Values mirror institutional reusable-KYC gate-A expectations — not runtime harness coupling.

/** Expected funnel invariants when reference scenario passes decision gate A. */
export const REFERENCE_HARNESS_FUNNEL_INVARIANTS = {
  provider_verifications: 1,
  application_verifications: 2,
  raw_kyc_recollections: 0,
  reuse_count_min: 1,
} as const;

export const REFERENCE_HARNESS_PRIVACY_INVARIANTS = {
  forbidden_fields_in_partner_payload: 0,
} as const;

export const REFERENCE_HARNESS_OPERATOR_INVARIANTS = {
  operator_actions_after_trust_config: 0,
} as const;

export const REFERENCE_HARNESS_REVOCATION_INVARIANT = "blocked" as const;
