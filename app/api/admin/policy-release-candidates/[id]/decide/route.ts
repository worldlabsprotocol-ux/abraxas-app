// FILE: app/api/admin/policy-release-candidates/[id]/decide/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import {
  decideReleaseCandidate,
  decideReleaseOverride,
  policyRcCsrfRejected,
} from "@/lib/partner/policyReleaseCandidate";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;
  if (policyRcCsrfRejected(req)) {
    return NextResponse.json({ error: "policy_release_candidate_csrf_required" }, { status: 403 });
  }
  const limited = checkLaunchpadRateLimit(req, "admin:policy-release-candidate-decide", 8, 60);
  if (!limited.allowed) {
    return NextResponse.json({ error: "policy_release_candidate_rate_limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  if (decideReleaseOverride(body)) {
    return NextResponse.json({ error: "policy_release_candidate_client_override_rejected" }, { status: 400 });
  }
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const result = await decideReleaseCandidate({
    candidateId: params.id,
    body,
    confirm: record.confirm === true,
  });
  if (!result.ok) {
    const status = result.code === "not_found"
      ? 404
      : result.code === "policy_release_candidate_store_unavailable"
        ? 503
        : 400;
    return NextResponse.json({
      error: result.code,
      creates_policy: false,
      publishes_catalog: false,
      activates_mainnet: false,
    }, { status });
  }
  return NextResponse.json({
    ok: true,
    replay: result.replay,
    creates_policy: false,
    publishes_catalog: false,
    activates_mainnet: false,
    executes: false,
    mints_receipt: false,
    item: result.item,
  }, { headers: { "Cache-Control": "no-store" } });
}
