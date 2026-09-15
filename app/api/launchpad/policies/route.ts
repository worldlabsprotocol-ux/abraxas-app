// FILE: app/api/launchpad/policies/route.ts
// Predefined policy templates for Partner Launchpad.

import { LAUNCHPAD_POLICY_TEMPLATE_LIST } from "@/lib/partner/launchpad/policyCatalog";
import { launchpadJson } from "@/lib/partner/launchpad/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET() {
  return launchpadJson({
    ok: true,
    policies: LAUNCHPAD_POLICY_TEMPLATE_LIST.map((template) => ({
      id: template.id,
      label: template.label,
      user_explanation: template.userExplanation,
      disclosed_result: template.disclosedResult,
      receipt_claim: template.receiptClaim,
      receipt_lifetime_hours: template.receiptLifetimeHours,
      reuse_policy: template.reusePolicy,
      permitted_methods: template.permittedMethods,
    })),
  });
}
