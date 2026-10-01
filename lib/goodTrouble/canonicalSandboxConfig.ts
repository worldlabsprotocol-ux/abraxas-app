// FILE: lib/goodTrouble/canonicalSandboxConfig.ts
// Canonical Good Trouble sandbox pilot — Launchpad track (not legacy hosted demo).

export {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_APP_SLUG,
  GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE,
  GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
  GOOD_TROUBLE_EXPECTED_CALLBACK_HOST,
  GOOD_TROUBLE_EXPECTED_CALLBACK_PATH,
  GOOD_TROUBLE_LEGACY,
} from "@/lib/goodTrouble/canonicalProductionConfig";

import {
  GOOD_TROUBLE_CANONICAL_APP_SLUG,
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE,
  GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
  GOOD_TROUBLE_LEGACY,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import { SITE_URL } from "@/lib/siteUrl";

/** Holder-facing purpose copy for the 21+ pilot. */
export const GOOD_TROUBLE_HOLDER_PURPOSE =
  "Good Trouble wants to confirm you are 21 or older.";

export const GOOD_TROUBLE_HOLDER_SHARED = "21+ eligibility: Yes";

export const GOOD_TROUBLE_HOLDER_NOT_SHARED = [
  "Date of birth",
  "Identity document",
  "Document number",
] as const;

export const GOOD_TROUBLE_CANONICAL_VERIFY_URL_PATTERN =
  `${SITE_URL}/partner/verify?app=${GOOD_TROUBLE_CANONICAL_APP_SLUG}&return_url=<allowlisted_callback>`;

export const GOOD_TROUBLE_CANONICAL_FIRST_TEST = {
  partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  application_slug: GOOD_TROUBLE_CANONICAL_APP_SLUG,
  policy_template: GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE,
  policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
  result_family: GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
  minimum_assurance: POLICY_PACKS.age_21_retail.minimum_assurance,
  receipt_lifetime_hours: POLICY_PACKS.age_21_retail.receipt_lifetime_hours,
  return_url: GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
  holder_purpose: GOOD_TROUBLE_HOLDER_PURPOSE,
  disclosed_result: POLICY_PACKS.age_21_retail.disclosed_result,
} as const;

/** Legacy compatibility track — hosted Abraxas demo + older Wix wiring. */
export const GOOD_TROUBLE_LEGACY_SANDBOX = {
  ...GOOD_TROUBLE_LEGACY,
  note: "Legacy compatibility only. Canonical pilot uses good-trouble Launchpad application.",
} as const;

export function isCanonicalGoodTroublePartnerId(partnerId: string): boolean {
  return partnerId.trim() === GOOD_TROUBLE_CANONICAL_PARTNER_ID;
}

export function isLegacyGoodTroublePartnerId(partnerId: string): boolean {
  return partnerId.trim() === GOOD_TROUBLE_LEGACY.partner_id;
}
