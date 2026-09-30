// FILE: lib/goodTrouble/canonicalProductionConfig.ts
// Canonical Good Trouble production pilot identifiers (Launchpad path).

import { buildLaunchpadPolicyId } from "@/lib/partner/launchpad/policyCatalog";
import {
  GOOD_TROUBLE_PARTNER_ID as LEGACY_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID as LEGACY_RETAIL_POLICY_ID,
  GOOD_TROUBLE_INTEGRATION_PATH,
  GOOD_TROUBLE_ENTER_PATH,
} from "@/lib/goodTrouble/constants";

export const GOOD_TROUBLE_CANONICAL_PARTNER_ID = "good-trouble" as const;
export const GOOD_TROUBLE_CANONICAL_APP_SLUG = "good-trouble" as const;
export const GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE = "age_21_retail" as const;
export const GOOD_TROUBLE_CANONICAL_RESULT_FAMILY = "age_eligible_21" as const;
export const GOOD_TROUBLE_CANONICAL_POLICY_ID = buildLaunchpadPolicyId(
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE,
);

/** Approved production callback host (HTTPS, no query). */
export const GOOD_TROUBLE_EXPECTED_CALLBACK_HOST = "www.goodtroublecanna.com" as const;
export const GOOD_TROUBLE_EXPECTED_CALLBACK_PATH = "/age-verification-result" as const;
export const GOOD_TROUBLE_EXPECTED_CALLBACK_URL =
  `https://${GOOD_TROUBLE_EXPECTED_CALLBACK_HOST}${GOOD_TROUBLE_EXPECTED_CALLBACK_PATH}` as const;

/** Legacy sandbox pilot — not the canonical production path. */
export const GOOD_TROUBLE_LEGACY = {
  partner_id: LEGACY_PARTNER_ID,
  retail_policy_id: LEGACY_RETAIL_POLICY_ID,
  integration_path: GOOD_TROUBLE_INTEGRATION_PATH,
  enter_path: GOOD_TROUBLE_ENTER_PATH,
  verify_path: "/partner/verify",
} as const;

export const GOOD_TROUBLE_CANONICAL_HANDOFF = {
  endpoint: "/api/v1/partner-handoff",
  public_receipt_endpoint: "/api/receipts/{receipt_id}/public",
  hosted_flow_path: "/partner/continue",
  verify_method: "AbraxasPartnerKit.verifyForAction",
} as const;
