// FILE: app/api/launchpad/applications/[id]/integration-timeline/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { buildIntegrationTimeline } from "@/lib/partner/integrationObservability";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/integration-timeline", auth.session.partnerId, 30);
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const requestId = req.nextUrl.searchParams.get("request_id")?.trim() || undefined;
  const receiptId = req.nextUrl.searchParams.get("receipt_id")?.trim() || undefined;

  const timeline = await buildIntegrationTimeline({
    partnerId: auth.session.partnerId,
    applicationId: app.id,
    requestId,
    receiptId,
  });
  if (!timeline.ok) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, timeline.code);
  return launchpadJson({ ...timeline } as Record<string, unknown>);
}
