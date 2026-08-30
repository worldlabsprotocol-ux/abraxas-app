// FILE: lib/goodTrouble/retailEligibility.ts
// Retail eligibility policy constants + verify examples for Good Trouble pilot.

import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { SITE_URL } from "@/lib/siteUrl";

/** Active v1 rules — product_eligibility enforcement deferred to v2 draft publish (migration 076). */
export const GOOD_TROUBLE_RETAIL_POLICY_RULES = {
  sandbox_only: true,
  required_claims: [
    { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
    { claim_type: "liveness_passed", max_age_hours: 8760 },
    { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
    { claim_type: "residency_country", max_age_hours: 8760 },
  ],
  account_required: true,
  consent_required: true,
  minimum_age: 21,
  session_receipt_hours: 24,
  /** Missouri adult-use — eligibility enforced via product_eligibility claim after v2 publish, not raw DOB */
  product_eligibility_action: "regulated_retail_purchase",
  biometric_thresholds: {
    face_min: 0.90,
    liveness_min: 0.92,
    fraud_risk_max: 0.15,
    alignment_min: 0.45,
    blur_min: 0.40,
    lighting_min: 0.38,
    screen_replay_max: 0.45,
    deepfake_max: 0.50,
  },
} as const;

export {
  GOOD_TROUBLE_RETAIL_V2_PENDING_RULES as GOOD_TROUBLE_RETAIL_V2_POLICY_RULES,
} from "@/lib/policy/productionPolicyContract";

export const GOOD_TROUBLE_VERIFY_EXAMPLE = `// Server-side: verify credential JWT (never wallet-address-only)
const res = await fetch("${SITE_URL}/api/credentials/verify", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer abx_test_YOUR_KEY",
  },
  body: JSON.stringify({
    credential_jwt: sessionCredentialJwt,
    policy_id: "${GOOD_TROUBLE_RETAIL_POLICY_ID}",
    verifier_id: "${GOOD_TROUBLE_PARTNER_ID}",
  }),
});

const result = await res.json();
// decision: approved | denied | manual_review
// decision_receipt — signed session receipt, no PII
// Validate receipt at transaction time via GET /api/v1/receipts/{receipt_id}`;

export const GOOD_TROUBLE_BATCH_VERIFY_EXAMPLE = `// Batch provenance lookup (pilot registry fixtures)
const res = await fetch(
  "${SITE_URL}/api/good-trouble/batch?record_id=ABX-CNB-BATCH-002"
);
const batch = await res.json();
// batch.cultivar, batch.coa_status, batch.lab — partner-attested metadata`;
