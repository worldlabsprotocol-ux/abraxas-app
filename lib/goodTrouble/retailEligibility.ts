// FILE: lib/goodTrouble/retailEligibility.ts
// Retail eligibility policy constants + verify examples for Good Trouble pilot.

import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { SITE_URL } from "@/lib/siteUrl";

export const GOOD_TROUBLE_RETAIL_POLICY_RULES = {
  required_claims: [
    { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
    { claim_type: "liveness_passed", max_age_hours: 8760 },
    { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
    { claim_type: "residency_country", max_age_hours: 8760 },
  ],
  account_required: true,
  consent_required: true,
  /** Missouri adult-use — partner maps approved decision to 21+ gate in their POS */
  product_eligibility_action: "regulated_retail_purchase",
} as const;

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
