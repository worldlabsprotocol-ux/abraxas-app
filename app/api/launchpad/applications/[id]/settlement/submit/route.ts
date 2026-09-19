// FILE: app/api/launchpad/applications/[id]/settlement/submit/route.ts
// Explicit Circle Arc testnet submit. Never creates an intent.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { CIRCLE_PUBLIC_CODES } from "@/lib/settlement/circle/codes";
import { submitCircleSettlementIntent } from "@/lib/settlement/circle/execute";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

function httpStatus(code: string, ok: boolean): number {
  if (ok) return 200;
  if (code === LAUNCHPAD_PUBLIC_ERRORS.unauthorized) return 401;
  if (code === LAUNCHPAD_PUBLIC_ERRORS.application_not_found) return 404;
  if (code === CIRCLE_PUBLIC_CODES.intent_not_found) return 404;
  if (
    code === CIRCLE_PUBLIC_CODES.duplicate
    || code === CIRCLE_PUBLIC_CODES.duplicate_submit
    || code === CIRCLE_PUBLIC_CODES.not_pending
  ) {
    return 409;
  }
  if (
    code === CIRCLE_PUBLIC_CODES.unavailable
    || code === CIRCLE_PUBLIC_CODES.schema_unavailable
    || code === CIRCLE_PUBLIC_CODES.production_blocked
    || code === CIRCLE_PUBLIC_CODES.live_credentials_blocked
    || code === CIRCLE_PUBLIC_CODES.environment_blocked
  ) {
    return 503;
  }
  return 400;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/settlement/submit",
    auth.session.partnerId,
    8,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return launchpadError(CIRCLE_PUBLIC_CODES.invalid_input, 400);
  }

  const result = await submitCircleSettlementIntent({
    application: app,
    partnerId: auth.session.partnerId,
    intentId: String(body.intent_id ?? ""),
    body,
  });
  return launchpadJson(
    { ...result, error: result.ok ? undefined : result.code },
    httpStatus(String(result.code), result.ok),
  );
}
