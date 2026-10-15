// FILE: lib/passport/reusableCredential/testInstitutionalPolicySeed.ts

import { PRODUCT_ELIGIBILITY_OVER_21 } from "@/lib/idv/ageEligibility";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import { BUILD_566_PARTNER_A, BUILD_566_PARTNER_B, BUILD_566_POLICY_ID } from "./fixtures";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";

const PRODUCTION_STYLE_RULES: PartnerPolicyRules = {
  sandbox_only: false,
  required_claims: [
    {
      claim_type: "product_eligibility",
      must_equal: PRODUCT_ELIGIBILITY_OVER_21,
      max_age_hours: 8760,
      min_assurance: "L2",
      accepted_issuers: ["issuer:abraxas"],
    },
  ],
};

const PARTNER_B_POLICY_ID = "institutional-age-21-partner-b-v1";

export async function seedBuild568InstitutionalPartnerPoliciesForTests(): Promise<void> {
  await queryAbraxasPg(
    `insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
     values ($1, $2, 1, $3, $4::jsonb, 'active')
     on conflict (id) do update set
       partner_id = excluded.partner_id,
       rules_json = excluded.rules_json,
       status = 'active'`,
    [
      BUILD_566_POLICY_ID,
      BUILD_566_PARTNER_A,
      "Build 568 Partner A institutional age policy",
      JSON.stringify(PRODUCTION_STYLE_RULES),
    ],
  );
  await queryAbraxasPg(
    `insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
     values ($1, $2, 1, $3, $4::jsonb, 'active')
     on conflict (id) do update set
       partner_id = excluded.partner_id,
       rules_json = excluded.rules_json,
       status = 'active'`,
    [
      PARTNER_B_POLICY_ID,
      BUILD_566_PARTNER_B,
      "Build 568 Partner B institutional age policy",
      JSON.stringify(PRODUCTION_STYLE_RULES),
    ],
  );
}

export const BUILD_568_PARTNER_B_POLICY_ID = PARTNER_B_POLICY_ID;
