// FILE: app/api/admin/launchpad/production-requests/[id]/review/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import {
  approveLaunchpadProductionAccess,
  rejectLaunchpadProductionAccess,
} from "@/lib/partner/launchpad/productionApproval";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  let body: { decision?: string; reviewer_notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const decision = body.decision === "approved" ? "approved" : body.decision === "rejected" ? "rejected" : null;
  if (!decision) {
    return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });
  }

  if (decision === "rejected") {
    const result = await rejectLaunchpadProductionAccess({
      requestId: params.id,
      reviewerNotes: body.reviewer_notes,
    });
    if (!result.ok) {
      const status = result.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: result.code }, { status });
    }
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  const result = await approveLaunchpadProductionAccess({
    requestId: params.id,
    reviewerNotes: body.reviewer_notes,
  });

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : result.code === "invalid_state" ? 400 : 503;
    return NextResponse.json({ error: result.code }, { status });
  }

  return NextResponse.json({
    ok: true,
    status: "approved",
    application_id: result.application_id,
    partner_id: result.partner_id,
    key_prefix: result.key_prefix,
    idempotency_replay: result.idempotency_replay,
  });
}
