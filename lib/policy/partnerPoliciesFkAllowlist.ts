// FILE: lib/policy/partnerPoliciesFkAllowlist.ts
// Inbound FK constraints permitted to reference public.partner_policies before P1-1 DDL.
// Must stay in sync with supabase/migrations/055_policy_immutable_versions.sql.

/** Reviewed FK constraint names — migration 055 aborts if any other inbound FK exists. */
export const PARTNER_POLICIES_ALLOWED_INBOUND_FKS = [
  "verification_requests_policy_id_fkey",
  "partner_issuer_trust_rules_policy_id_fkey",
] as const;

export type PartnerPoliciesAllowedInboundFk =
  (typeof PARTNER_POLICIES_ALLOWED_INBOUND_FKS)[number];
