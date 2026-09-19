// FILE: app/api/launchpad/applications/[id]/action-control-plane/route.ts
// Session-bound Launchpad control plane. Never activates Production.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { ACTION_CONTROL_PLANE_PRODUCTION } from "@/lib/partner/actionControlPlane/contract";
import { buildActionControlPlaneForApplication } from "@/lib/partner/actionControlPlane/load";
import { sanitizeActionControlPlaneValue } from "@/lib/partner/actionControlPlane/sanitize";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

const PRODUCTION_ACTIONS = new Set([
  "activate_production",
  "request_production",
  "issue_production_key",
  "reveal_production_key",
  "upgrade_production",
]);

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/action-control-plane",
    auth.session.partnerId,
    30,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const view = await buildActionControlPlaneForApplication({
    application: app,
    partnerId: auth.session.partnerId,
  });
  return launchpadJson(sanitizeActionControlPlaneValue(view));
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/action-control-plane/write",
    auth.session.partnerId,
    8,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }

  const action = String(body.action ?? "");
  if (PRODUCTION_ACTIONS.has(action)) {
    return launchpadError(
      ACTION_CONTROL_PLANE_PRODUCTION.deny_code,
      403,
      ACTION_CONTROL_PLANE_PRODUCTION.notice,
    );
  }

  return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
}
