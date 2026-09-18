// FILE: app/api/launchpad/policies/route.ts
// Predefined policy templates for Partner Launchpad.

import { LAUNCHPAD_POLICY_TEMPLATE_LIST } from "@/lib/partner/launchpad/policyCatalog";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import { launchpadJson } from "@/lib/partner/launchpad/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET() {
  return launchpadJson({
    ok: true,
    catalog_version: 1,
    google_account_not_eligibility:
      "Google sign-in creates an Abraxas account. It does not prove age, identity, residency, wallet control, membership, or any other eligibility claim.",
    policies: LAUNCHPAD_POLICY_TEMPLATE_LIST.map((template) => {
      const pack = POLICY_PACKS[template.id];
      return {
        id: template.id,
        label: template.label,
        user_explanation: template.userExplanation,
        disclosed_result: template.disclosedResult,
        receipt_claim: template.receiptClaim,
        receipt_lifetime_hours: template.receiptLifetimeHours,
        reuse_policy: template.reusePolicy,
        permitted_methods: template.permittedMethods,
        required_claims: pack.required_claims,
        minimum_assurance: pack.minimum_assurance,
        intended_use_examples: pack.intended_use_examples,
        partner_receives: pack.partner_receives,
        partner_does_not_receive: pack.partner_does_not_receive,
        production_suitability: pack.production_suitability,
      };
    }),
  });
}
