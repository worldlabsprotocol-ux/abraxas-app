// FILE: lib/partner/universalIntegration/exampleMerchantStagingProfile.ts
// Operator-facing Example Merchant staging profile — not Good Trouble.

import { POLICY_PACKS, type PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import { REFERENCE_RP_ENV_KEYS } from "@/lib/partner/referenceRelyingPartyConfig";
import { STAGING_LIVE_E2E_ENV_KEYS } from "./stagingConfigContract";

/** Launchpad policy pack for 21+ eligibility-only disclosure. */
export const EXAMPLE_MERCHANT_POLICY_PACK_ID: PolicyPackId = "age_21_retail";

export const EXAMPLE_MERCHANT_DISCLOSED_RESULT =
  POLICY_PACKS[EXAMPLE_MERCHANT_POLICY_PACK_ID].disclosed_result;

export const EXAMPLE_MERCHANT_OPERATOR_ENV_KEYS = {
  ...REFERENCE_RP_ENV_KEYS,
  ...STAGING_LIVE_E2E_ENV_KEYS,
  executeLive: "EXAMPLE_MERCHANT_EXECUTE_LIVE",
  designatedTestHolderStorage: "PLAYWRIGHT_STORAGE_STATE",
  stagingUrl: "LAUNCHPAD_STAGING_URL",
} as const;

/**
 * Pinned partner_policies.policy_id is operator-specific (e.g. acme-age_21_retail-v1).
 * Policy pack / disclosed result must match age_21_retail → age_eligible_21.
 */
export function validateExampleMerchantPolicyBinding(input: {
  policyTemplateId: string;
  disclosedResult?: string | null;
}): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (input.policyTemplateId !== EXAMPLE_MERCHANT_POLICY_PACK_ID) {
    errors.push(`policy_template_must_be_${EXAMPLE_MERCHANT_POLICY_PACK_ID}`);
  }
  if (input.disclosedResult && input.disclosedResult !== EXAMPLE_MERCHANT_DISCLOSED_RESULT) {
    errors.push(`disclosed_result_must_be_${EXAMPLE_MERCHANT_DISCLOSED_RESULT}`);
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function exampleMerchantOperatorChecklist(): string[] {
  return [
    "Provision Launchpad sandbox application with policy pack age_21_retail (discloses age_eligible_21 only).",
    "Record partner_id, pinned policy_id, application UUID, and HTTPS callback on allowlist.",
    `Export ${REFERENCE_RP_ENV_KEYS.partnerId}, ${REFERENCE_RP_ENV_KEYS.policyId}, ${REFERENCE_RP_ENV_KEYS.returnUrl}, ${REFERENCE_RP_ENV_KEYS.baseUrl}.`,
    `Set ${STAGING_LIVE_E2E_ENV_KEYS.expectedSupabaseRef} to the demo/staging Supabase ref (never production bztwutzprwsdrtqdpymf).`,
    "Confirm GET /api/launchpad/staging/environment on the preview reports deployment_environment=preview and matching supabase_project_ref.",
    "Designate authorized test holder; save session with PLAYWRIGHT_STORAGE_STATE (never commit).",
    "Run npm run partner:staging-activate, then EXAMPLE_MERCHANT_EXECUTE_LIVE=1 npm run partner:staging-activate for Playwright + receipt verify.",
  ];
}
