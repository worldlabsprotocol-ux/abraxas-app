// FILE: lib/partner/launchpad/apiHelpers.ts
// Shared JSON helpers for Partner Launchpad API routes.

import { NextRequest, NextResponse } from "next/server";
import {
  requirePartnerConsoleSession,
  resolvePartnerConsoleSessionKeyId,
  type PartnerConsoleSession,
} from "@/lib/partner/launchpad/partnerConsoleSession";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { launchpadPublicErrorBody } from "@/lib/partner/launchpad/publicErrorMessages";
import { checkLaunchpadRateLimit, checkLaunchpadTenantRateLimit } from "@/lib/partner/launchpad/rateLimit";

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
  retryAfterSec?: number,
): NextResponse {
  return NextResponse.json(
    launchpadPublicErrorBody(
      code,
      typeof retryAfterSec === "number" ? { retryAfterSec } : undefined,
      message,
    ),
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

/** Session-scoped operator id for settlement selection binding (API key or native account). */
export function requireLaunchpadSessionKeyId(session: PartnerConsoleSession) {
  const sessionKeyId = resolvePartnerConsoleSessionKeyId(session);
  if (!sessionKeyId) {
    return {
      ok: false as const,
      response: launchpadError(
        LAUNCHPAD_PUBLIC_ERRORS.unauthorized,
        401,
        "Partner console operator identity unavailable",
      ),
    };
  }
  return { ok: true as const, sessionKeyId };
}

export async function enforceLaunchpadRateLimit(
  req: NextRequest,
  route: string,
  limit: number,
): Promise<NextResponse | null> {
  const result = await checkLaunchpadRateLimit(req, route, limit);
  if (!result.allowed) {
    return launchpadError("launchpad_rate_limited", 429, undefined, result.retryAfterSec);
  }
  return null;
}

export async function enforceLaunchpadTenantRateLimit(
  req: NextRequest,
  route: string,
  tenantId: string,
  limit: number,
  code = "sandbox_rate_limited",
): Promise<NextResponse | null> {
  const ip = await checkLaunchpadRateLimit(req, route, limit);
  const tenant = await checkLaunchpadTenantRateLimit(req, route, tenantId, limit);
  if (!ip.allowed) {
    return launchpadError(code, 429, undefined, ip.retryAfterSec);
  }
  if (!tenant.allowed) {
    return launchpadError(code, 429, undefined, tenant.retryAfterSec);
  }
  return null;
}
