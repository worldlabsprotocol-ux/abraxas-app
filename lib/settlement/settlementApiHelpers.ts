// FILE: lib/settlement/settlementApiHelpers.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import { requireLaunchpadSession } from "@/lib/partner/launchpad/apiHelpers";
import { SETTLEMENT_PUBLIC_ERRORS } from "@/lib/settlement/publicErrors";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";

export function settlementJson(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

export function settlementError(code: string, status: number, message?: string): NextResponse {
  return NextResponse.json({ ok: false, code, error: message ?? code }, { status });
}

export async function requireSettlementPartnerAuth(
  req: NextRequest,
  applicationId: string,
): Promise<
  | { ok: true; partnerId: string; applicationId: string }
  | { ok: false; response: NextResponse }
> {
  const sessionAuth = await requireLaunchpadSession(req);
  if (sessionAuth.ok) {
    const app = await getLaunchpadApplicationForPartner(applicationId, sessionAuth.session.partnerId);
    if (!app) {
      return {
        ok: false,
        response: settlementError(SETTLEMENT_PUBLIC_ERRORS.application_not_found, 404),
      };
    }
    return { ok: true, partnerId: sessionAuth.session.partnerId, applicationId };
  }

  const partnerAuth = await authenticatePartner(req);
  if (!partnerAuth || !partnerAuth.ok) {
    return {
      ok: false,
      response: settlementError(SETTLEMENT_PUBLIC_ERRORS.unauthorized, 401),
    };
  }

  const app = await getLaunchpadApplicationForPartner(applicationId, partnerAuth.ctx.partnerId);
  if (!app) {
    return {
      ok: false,
      response: settlementError(SETTLEMENT_PUBLIC_ERRORS.application_not_found, 404),
    };
  }

  return { ok: true, partnerId: partnerAuth.ctx.partnerId, applicationId };
}
