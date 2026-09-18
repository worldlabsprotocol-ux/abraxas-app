// FILE: lib/partner/launchpad/apiHelpers.ts
// Shared JSON helpers for Partner Launchpad API routes.

import { NextRequest, NextResponse } from "next/server";
import { requirePartnerConsoleSession } from "@/lib/partner/launchpad/partnerConsoleSession";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";

export function launchpadJson(
  body: Record<string, unknown>,
  status = 200,
): NextResponse {
  return NextResponse.json(body, { status });
}

export function launchpadError(
  code: string,
  status: number,
  message?: string,
): NextResponse {
  return NextResponse.json(
    { ok: false, code, error: message ?? code },
    { status },
  );
}

export async function requireLaunchpadSession(req: NextRequest) {
  const session = await requirePartnerConsoleSession(req);
  if (!session.ok) {
    return {
      ok: false as const,
      response: launchpadError(
        LAUNCHPAD_PUBLIC_ERRORS.unauthorized,
        session.status,
        session.error,
      ),
    };
  }
  return { ok: true as const, session: session.session };
}

export function enforceLaunchpadRateLimit(
  req: NextRequest,
  route: string,
  limit: number,
): NextResponse | null {
  const result = checkLaunchpadRateLimit(req, route, limit);
  if (!result.allowed) {
    return launchpadError("launchpad_rate_limited", 429);
  }
  return null;
}
