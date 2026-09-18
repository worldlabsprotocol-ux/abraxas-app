// FILE: lib/partner/launchpad/resolvePinnedPolicyVersion.ts
// Resolve the Launchpad application's explicitly adopted policy version pin.

import {
  getLaunchpadApplicationBySlug,
  getLaunchpadApplicationForPartner,
} from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import type { PartnerFlowLaunchpadContext } from "@/lib/partner/launchpad/mapPartnerFlowActivity";

export async function resolveLaunchpadPinnedPolicyVersion(input: {
  context: PartnerFlowLaunchpadContext;
  partnerId: string;
  policyId: string;
}): Promise<number | undefined> {
  if (input.context.applicationId) {
    const app = await getLaunchpadApplicationForPartner(input.context.applicationId, input.partnerId);
    if (app && app.policy_id === input.policyId) return app.policy_version;
  }
  const slug = input.context.appSlug?.trim();
  if (slug) {
    const app = await getLaunchpadApplicationBySlug(slug);
    if (app && app.partner_id === input.partnerId && app.policy_id === input.policyId) {
      return app.policy_version;
    }
  }
  return undefined;
}
