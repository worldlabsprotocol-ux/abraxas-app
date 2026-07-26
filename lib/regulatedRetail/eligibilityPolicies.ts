// FILE: lib/regulatedRetail/eligibilityPolicies.ts
// Shared retail eligibility policies — cannabis partner + spirits template.

import { GOOD_TROUBLE_PARTNER_ID, GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";

export const SPIRITS_RETAIL_POLICY_ID = "spirits-retail-v1" as const;
export const SPIRITS_RETAIL_PARTNER_ID = "spirits-retail-template" as const;

export interface RetailEligibilityPolicy {
  policy_id: string;
  verifier_id: string;
  vertical: "cannabis_adult_use" | "spirits_age_gated";
  minimum_age: number;
  required_claims: Array<{
    claim_type: string;
    max_age_hours: number;
    min_assurance?: string;
  }>;
  requested_action: string;
  consent_required: boolean;
  note: string;
}

export const GOOD_TROUBLE_RETAIL_POLICY: RetailEligibilityPolicy = {
  policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
  verifier_id: GOOD_TROUBLE_PARTNER_ID,
  vertical: "cannabis_adult_use",
  minimum_age: 21,
  required_claims: [
    { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
    { claim_type: "liveness_passed", max_age_hours: 8760 },
    { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
    { claim_type: "residency_country", max_age_hours: 8760 },
  ],
  requested_action: "regulated_retail_purchase",
  consent_required: true,
  note: "Missouri adult-use cannabis — partner maps approved decision to 21+ site gate and POS.",
};

/** Template for spirits DTC / hospitality — no live partner until contracted */
export const SPIRITS_RETAIL_POLICY_TEMPLATE: RetailEligibilityPolicy = {
  policy_id: SPIRITS_RETAIL_POLICY_ID,
  verifier_id: SPIRITS_RETAIL_PARTNER_ID,
  vertical: "spirits_age_gated",
  minimum_age: 21,
  required_claims: [
    { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
    { claim_type: "government_id_verified", max_age_hours: 8760 },
    { claim_type: "residency_country", max_age_hours: 8760 },
  ],
  requested_action: "regulated_retail_purchase",
  consent_required: true,
  note: "Template policy for age-gated spirits checkout — customize jurisdiction and screening per partner counsel.",
};

export function retailVerifyExample(policy: RetailEligibilityPolicy): string {
  return `// Age-gated retail — verify at checkout (not a cached checkbox)
const res = await fetch("https://abraxas-app.vercel.app/api/credentials/verify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer abx_YOUR_PARTNER_KEY",
  },
  body: JSON.stringify({
    sui_address: customerWallet,
    requested_action: "${policy.requested_action}",
    policy_id: "${policy.policy_id}",
    verifier_id: "${policy.verifier_id}",
  }),
});

const { decision, claims_disclosed, proof_id } = await res.json();
// approved → unlock ${policy.minimum_age}+ purchase · denied → block · manual_review → staff queue`;
}
