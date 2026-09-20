// FILE: app/api/admin/production-review/route.ts
// Operator-only Production-review queue. Safe fields only.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { loadProductionReviewQueue } from "@/lib/partner/launchpad/productionReview";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;
  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  if (status !== "pending" && status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const result = await loadProductionReviewQueue(status);
  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: 503 });
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
