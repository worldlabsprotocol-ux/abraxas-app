// FILE: lib/partner/launchpad/extractLaunchpadFlowContext.ts

import type { PartnerFlowLaunchpadContext } from "@/lib/partner/launchpad/mapPartnerFlowActivity";

export function extractLaunchpadFlowContext(body: {
  app?: string;
  launchpad_application_id?: string;
  application_id?: string;
}): PartnerFlowLaunchpadContext {
  return {
    appSlug: body.app?.trim() || null,
    applicationId: body.launchpad_application_id?.trim() || body.application_id?.trim() || null,
  };
}
