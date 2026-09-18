// FILE: app/api/launchpad/auth/session/route.ts
// Partner Launchpad console session — HttpOnly cookie, no browser storage for API keys.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import {
  attachPartnerConsoleSessionCookie,
  clearPartnerConsoleSessionCookie,
  issuePartnerConsoleSessionToken,
  resolvePartnerConsoleSession,
} from "@/lib/partner/launchpad/partnerConsoleSession";
import { launchpadError, launchpadJson, enforceLaunchpadRateLimit } from "@/lib/partner/launchpad/apiHelpers";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await resolvePartnerConsoleSession(req);
  if (!session) {
    return launchpadJson({ ok: false, authenticated: false });
  }
  return launchpadJson({
    ok: true,
    authenticated: true,
    partner_id: session.partnerId,
    environment: session.environment,
  });
}

export async function POST(req: NextRequest) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/auth/session", 20);
  if (limited) return limited;

  const auth = await authenticatePartner(req);
  if (!auth) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.unauthorized, 401, "API key required");
  }
  if (!auth.ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.unauthorized, auth.status, auth.error);
  }

  const token = await issuePartnerConsoleSessionToken({
    partnerId: auth.ctx.partnerId,
    apiKeyId: auth.ctx.apiKeyId,
    environment: auth.ctx.keyPrefix.startsWith("abx_live_") ? "production" : "sandbox",
  });

  if (!token) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.not_configured, 503);
  }

  const res = launchpadJson({
    ok: true,
    partner_id: auth.ctx.partnerId,
    key_prefix: auth.ctx.keyPrefix,
    environment: auth.ctx.keyPrefix.startsWith("abx_live_") ? "production" : "sandbox",
  });
  attachPartnerConsoleSessionCookie(res, token);
  return res;
}

export async function DELETE() {
  const res = launchpadJson({ ok: true });
  clearPartnerConsoleSessionCookie(res);
  return res;
}
