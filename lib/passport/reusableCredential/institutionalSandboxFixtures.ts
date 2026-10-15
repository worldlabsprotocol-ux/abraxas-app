// FILE: lib/passport/reusableCredential/institutionalSandboxFixtures.ts
// Build #566 institutional RP fixtures — explicit sandbox execution only.

import type { PartnerPolicyRules } from "@/lib/policy/types";
import {
  BUILD_566_PARTNER_A,
  BUILD_566_PARTNER_B,
  BUILD_566_POLICY_ID,
  BUILD_566_POLICY_RULES,
} from "./fixtures";
import type { InstitutionalPartnerCatalogEntry } from "./institutionalPartnerCatalog";

export const PASSPORT_INSTITUTIONAL_SANDBOX_FIXTURES_ENV = "ABRAXAS_PASSPORT_INSTITUTIONAL_SANDBOX_FIXTURES";

export function isPassportInstitutionalSandboxFixturesEnabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  return env[PASSPORT_INSTITUTIONAL_SANDBOX_FIXTURES_ENV] === "1";
}

export function buildInstitutionalSandboxFixtureCatalog(): InstitutionalPartnerCatalogEntry[] {
  const rulesA: PartnerPolicyRules = { ...BUILD_566_POLICY_RULES, sandbox_only: true };
  const rulesB: PartnerPolicyRules = { ...BUILD_566_POLICY_RULES, sandbox_only: true };
  return [
    {
      partner_id: BUILD_566_PARTNER_A,
      partner_display_name: "Sandbox Institutional RP Example",
      policy_id: BUILD_566_POLICY_ID,
      policy_version: 1,
      policy_rules: rulesA,
      requested_attribute: "product_eligibility (over 21)",
      purpose: "Sandbox age-gated institutional access without collecting identity documents again.",
      disclosure_summary: [
        "Product eligibility outcome only",
        "No document images or biometrics",
        "Partner-bound authorization receipt",
      ],
      issuer_id: "issuer:abraxas",
      sandbox_labeled: true,
    },
    {
      partner_id: BUILD_566_PARTNER_B,
      partner_display_name: "Sandbox Partner Beta",
      policy_id: BUILD_566_POLICY_ID,
      policy_version: 1,
      policy_rules: rulesB,
      requested_attribute: "product_eligibility (over 21)",
      purpose: "Sandbox second relying party verification using the same reusable credential.",
      disclosure_summary: [
        "Product eligibility outcome only",
        "Separate receipt from Partner A",
        "No cross-institution receipt reuse",
      ],
      issuer_id: "issuer:abraxas",
      sandbox_labeled: true,
    },
  ];
}
