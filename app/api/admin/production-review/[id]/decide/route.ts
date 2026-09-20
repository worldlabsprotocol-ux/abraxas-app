// FILE: app/api/admin/production-review/[id]/decide/route.ts
// Explicit operator approve/reject. Never issues keys or activates Mainnet.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import {
  decideProductionReview,
  productionReviewClientOverride,
  productionReviewCsrfRejected,
} from "@/lib/partner/launchpad/productionReview";
import { PRODUCTION_REVIEW_DECISIONS } from "@/lib/partner/launchpad/productionReview/contract";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const csrf = productionReviewCsrfRejected(req);
  if (csrf) {
    return NextResponse.json({ error: "production_review_csrf_required" }, { status: 403 });
  }

  const limited = checkLaunchpadRateLimit(req, "admin:production-review:decide", 8, 60);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "production_review_rate_limited" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => null);
  if (productionReviewClientOverride(body)) {
    return NextResponse.json({ error: "production_review_client_override_rejected" }, { status: 400 });
  }
  const record = (body && typeof body === "object") ? body as Record<string, unknown> : {};
  const decision = record.decision;
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (!(PRODUCTION_REVIEW_DECISIONS as readonly string[]).includes(decision)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const result = await decideProductionReview({
    requestId: params.id,
    decision,
    confirm: record.confirm === true,
    remediationClass: typeof record.remediation_class === "string" ? record.remediation_class : null,
  });
  if (!result.ok) {
    const status = result.code === "not_found"
      ? 404
      : result.code === "production_review_store_unavailable"
        ? 503
        : 400;
    return NextResponse.json({
      error: result.code,
      remediation_class: result.remediation_class ?? "wait_for_reviewer",
      issues_production_key: false,
      activates_mainnet: false,
      executes: false,
    }, { status });
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
