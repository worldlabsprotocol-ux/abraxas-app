// FILE: app/api/launchpad/applications/[id]/institutional-integration/route.ts
// Build #588 institutional integration workspace payload.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { loadInstitutionalIntegrationWorkspaceForApplication } from "@/lib/partner/launchpad/loadInstitutionalIntegrationWorkspace";
import { institutionalIntegrationPayloadLeaks } from "@/lib/partner/launchpad/institutionalIntegrationSafety";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/institutional-integration",
    auth.session.partnerId,
    40,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const loaded = await loadInstitutionalIntegrationWorkspaceForApplication({
    app,
    partnerId: auth.session.partnerId,
  });
  if (!loaded.ok) {
    return launchpadError(loaded.code, 400);
  }

  const payload = {
    ok: true,
    workspace: loaded.workspace,
    sdk_snippet: loaded.sdk_snippet,
  };

  if (institutionalIntegrationPayloadLeaks(payload).length > 0) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 503, "redacted");
  }

  return launchpadJson(payload);
}
