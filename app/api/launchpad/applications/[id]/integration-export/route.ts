// FILE: app/api/launchpad/applications/[id]/integration-export/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import {
  buildIntegrationAuditExport,
  loadIntegrationEventsForApplication,
} from "@/lib/partner/integrationObservability";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(req, "/api/launchpad/integration-export", auth.session.partnerId, 10);
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const requestId = req.nextUrl.searchParams.get("request_id")?.trim() ?? "";
  const events = await loadIntegrationEventsForApplication({
    partnerId: auth.session.partnerId,
    applicationId: app.id,
    limit: 500,
  });
  const filtered = requestId
    ? events.filter((event) => event.request_id === requestId)
    : events;

  const exported = buildIntegrationAuditExport({
    partnerId: auth.session.partnerId,
    applicationId: app.id,
    environment: app.environment,
    events: filtered,
  });
  if ("ok" in exported && exported.ok === false) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, exported.code);
  }

  return new Response(JSON.stringify(exported, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="integration-audit-${app.public_slug}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
