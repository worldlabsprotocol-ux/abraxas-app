// FILE: app/api/launchpad/applications/[id]/settlement/route.ts
// Circle Arc testnet settlement. DEMO/testnet infrastructure only. Never activates production.

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
import {
  loadCircleSettlementView,
  runCircleSettlement,
} from "@/lib/settlement/circle/execute";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

function httpStatus(code: string, ok: boolean): number {
  if (ok) return 200;
  if (code === LAUNCHPAD_PUBLIC_ERRORS.unauthorized) return 401;
  if (code === LAUNCHPAD_PUBLIC_ERRORS.application_not_found) return 404;
  if (code === CIRCLE_PUBLIC_CODES.duplicate) return 409;
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

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/settlement",
    auth.session.partnerId,
    30,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const result = await loadCircleSettlementView({
    application: app,
    partnerId: auth.session.partnerId,
  });
  return launchpadJson({ ...result, error: result.ok ? undefined : result.code });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/settlement/run",
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

  const result = await runCircleSettlement({
    application: app,
    partnerId: auth.session.partnerId,
    receiptId: String(body.receipt_id ?? ""),
    amountMinor: body.amount_minor,
    body,
  });
  const terminalDuplicate = result.duplicate && (
    result.evidence?.state === "settled"
    || result.evidence?.state === "failed"
    || result.evidence?.state === "cancelled"
  );
  return launchpadJson(
    { ...result, error: result.ok ? undefined : result.code },
    terminalDuplicate ? 409 : httpStatus(String(result.code), result.ok),
  );
}
