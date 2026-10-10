// FILE: lib/cielo/cieloMerchantProfile.ts
// Canonical first-party Cielo merchant — maps to existing partner/receipt tables (not a duplicate engine).

import { CIELO_RECORD_ID } from "@/lib/cielo/cieloIds";
import { CIELO_SUNRISE_RENTAL_TENANT } from "@/lib/partner/hospitality/rentalOperatorTenants";
import { getRentalOperatorPolicyPack } from "@/lib/partner/hospitality/rentalOperatorContract";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";

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
  partner_id: string;
  policy_id: string;
  genesis_asset_id: typeof CIELO_RECORD_ID;
  policy_pack_template: PolicyPackId;
  disclosed_result: string;
  airbnb_listing_url: string;
  integration_mode: "first_party_adapter";
  generic_partner_flow_evaluate: false;
  rental_tenant: typeof CIELO_SUNRISE_RENTAL_TENANT;
}

export function getCieloMerchantCanonicalConfig(): CieloMerchantCanonicalConfig {
  const tenant = CIELO_SUNRISE_RENTAL_TENANT;
  const pack = getRentalOperatorPolicyPack(tenant.policyPackId);
  return {
    merchant_name: "Cielo Sunrise",
    partner_id: tenant.partnerId,
    policy_id: tenant.policyId,
    genesis_asset_id: CIELO_RECORD_ID,
    policy_pack_template: tenant.policyPackId,
    disclosed_result: pack.disclosed_result,
    airbnb_listing_url: tenant.externalBookingUrl ?? "",
    integration_mode: "first_party_adapter",
    generic_partner_flow_evaluate: false,
    rental_tenant: tenant,
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
