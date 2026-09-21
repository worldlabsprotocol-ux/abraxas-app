// FILE: app/api/admin/verification-issuer-trust/route.ts
// Operator read of the source-controlled issuer trust registry.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import {
  issuerTrustClientOverride,
  issuerTrustCsrfRejected,
  issuerTrustLeaks,
  projectIssuerTrustRegistry,
} from "@/lib/verification/issuerTrust";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;
  const limited = checkLaunchpadRateLimit(req, "admin:verification-issuer-trust", 20, 60);
  if (!limited.allowed) {
    return NextResponse.json({ error: "verification_issuer_trust_rate_limited" }, { status: 429 });
  }
  const body = projectIssuerTrustRegistry();
  if (issuerTrustLeaks(body).length > 0) {
    return NextResponse.json({ error: "verification_issuer_trust_unavailable" }, { status: 503 });
  }
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;
  if (issuerTrustCsrfRejected(req)) {
    return NextResponse.json({ error: "verification_issuer_trust_csrf_required" }, { status: 403 });
  }
  const parsed = await req.json().catch(() => ({}));
  if (issuerTrustClientOverride(parsed)) {
    return NextResponse.json({ error: "verification_issuer_trust_client_override_rejected" }, { status: 400 });
  }
  return NextResponse.json({
    error: "verification_issuer_trust_read_only",
    browser_can_publish: false,
    creates_policy: false,
    activates_mainnet: false,
  }, { status: 405 });
}
