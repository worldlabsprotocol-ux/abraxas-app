// FILE: app/api/launchpad/applications/[id]/pilot-progress/route.ts
// Partner-scoped pilot progress — no internal GTM or fundraising data.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { buildDesignPartnerApplicationView } from "@/lib/partner/designPartnerProgram";
import { buildPartnerPilotProgress } from "@/lib/partner/designPartnerProgram/partnerProgress";
import { designPartnerLeaks } from "@/lib/partner/designPartnerProgram/privacy";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/pilot-progress", auth.session.partnerId, 30);
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const view = await buildDesignPartnerApplicationView({ application: app });
  const progress = buildPartnerPilotProgress(view);

  const payload = { ok: true, progress };
  if (designPartnerLeaks(payload).length > 0) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "redacted");
  }
  return launchpadJson(payload);
}
