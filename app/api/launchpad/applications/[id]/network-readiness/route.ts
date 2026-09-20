// FILE: app/api/launchpad/applications/[id]/network-readiness/route.ts
// Network readiness for a Launchpad app. Never activates Mainnet.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { loadGoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness";
import {
  buildNetworkReadinessView,
  networkReadinessLeaks,
  rejectNetworkClientOverride,
} from "@/lib/partner/networkCapability";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/network-readiness",
    auth.session.partnerId,
    30,
  );
  if (limited) return limited;
  const query: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  if (rejectNetworkClientOverride(query)) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "unknown_input");
  }
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  const evidence = await loadGoLiveEvidence({ application: app, partnerId: auth.session.partnerId });
  const view = buildNetworkReadinessView(evidence);
  if (networkReadinessLeaks(view).length > 0) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 503, "redacted");
  }
  return launchpadJson({ ok: true, ...view });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/network-readiness",
    auth.session.partnerId,
    12,
  );
  if (limited) return limited;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (rejectNetworkClientOverride(body)) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "unknown_input");
  }
  const record = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  if (record.activate_production === true || record.environment === "production" || record.mainnet === true) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.forbidden, 403, "production_denied");
  }
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  const evidence = await loadGoLiveEvidence({ application: app, partnerId: auth.session.partnerId });
  const view = buildNetworkReadinessView(evidence);
  return launchpadJson({ ok: true, mutated: false, ...view });
}
