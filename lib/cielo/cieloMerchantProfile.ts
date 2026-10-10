// FILE: lib/cielo/cieloMerchantProfile.ts
// Canonical first-party Cielo merchant — maps to existing partner/receipt tables (not a duplicate engine).

import {
  CIELO_PARTNER_ID,
  CIELO_RECORD_ID,
  CIELO_VERIFIED_GUEST_POLICY_ID,
} from "@/lib/cielo/cieloIds";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import { CIELO_AIRBNB_URL } from "@/lib/data/flagshipProperty";

/** Demo Supabase project for staging activation (never production). */
export const CIELO_DEMO_SUPABASE_PROJECT_REF = "ocntwbxarpjeixdnzide";

export const CIELO_STAGING_ENV_KEYS = {
  stagingBaseUrl: "CIELO_STAGING_BASE_URL",
  expectedSupabaseRef: "LAUNCHPAD_EXPECTED_SUPABASE_REF",
  launchpadApplicationId: "CIELO_LAUNCHPAD_APPLICATION_ID",
  executeLiveHolderFlow: "CIELO_EXECUTE_LIVE_HOLDER_FLOW",
  vercelBypass: "VERCEL_PROTECTION_BYPASS",
  storageState: "PLAYWRIGHT_STORAGE_STATE",
} as const;

export interface CieloMerchantCanonicalConfig {
  merchant_name: "Cielo Sunrise";
  partner_id: typeof CIELO_PARTNER_ID;
  policy_id: typeof CIELO_VERIFIED_GUEST_POLICY_ID;
  genesis_asset_id: typeof CIELO_RECORD_ID;
  policy_pack_template: "age_21_retail";
  disclosed_result: string;
  airbnb_listing_url: string;
  integration_mode: "first_party_adapter";
  generic_partner_flow_evaluate: false;
}

export function getCieloMerchantCanonicalConfig(): CieloMerchantCanonicalConfig {
  const pack = POLICY_PACKS.age_21_retail;
  return {
    merchant_name: "Cielo Sunrise",
    partner_id: CIELO_PARTNER_ID,
    policy_id: CIELO_VERIFIED_GUEST_POLICY_ID,
    genesis_asset_id: CIELO_RECORD_ID,
    policy_pack_template: "age_21_retail",
    disclosed_result: pack.disclosed_result,
    airbnb_listing_url: CIELO_AIRBNB_URL,
    integration_mode: "first_party_adapter",
    generic_partner_flow_evaluate: false,
  };
}

export function cieloOperatorActivationChecklist(): string[] {
  const cfg = getCieloMerchantCanonicalConfig();
  return [
    `Confirm demo Supabase ref ${CIELO_DEMO_SUPABASE_PROJECT_REF} on preview (production ref forbidden).`,
    `Ensure partners row exists for partner_id=${cfg.partner_id} and policy ${cfg.policy_id} is active.`,
    "Designate authorized test holder; save PLAYWRIGHT_STORAGE_STATE locally.",
    `Set CIELO_STAGING_BASE_URL to HTTPS preview; run npm run cielo:staging-activate.`,
    "Complete /cielo/verified-rate holder journey (no fixture query params in staging proof).",
    "Operator reviews queue at /admin/cielo — approval is not a booking confirmation.",
    `External booking: use labeled link to Airbnb listing only (${cfg.airbnb_listing_url.split("?")[0]}…).`,
  ];
}
