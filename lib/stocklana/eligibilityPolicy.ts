// FILE: lib/stocklana/eligibilityPolicy.ts
// Sandbox policy contract for non-US eligibility (mirrors migration 087).

export const STOCKLANA_ELIGIBILITY_POLICY_RULES = {
  sandbox_only: true,
  blocked_jurisdictions: ["US"],
  required_claims: [
    { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
    { claim_type: "liveness_passed", max_age_hours: 8760 },
    { claim_type: "residency_country", max_age_hours: 8760 },
  ],
  account_required: true,
  consent_required: true,
  session_receipt_hours: 24,
} as const;
