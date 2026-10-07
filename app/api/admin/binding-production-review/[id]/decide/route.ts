// FILE: app/api/admin/binding-production-review/[id]/decide/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { decideBindingProduction } from "@/lib/partner/launchpad/bindingProduction/decide";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{  id: string  }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const routeParams = await params;
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const record = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const decision = record.decision;
  if (decision !== "approve" && decision !== "reject" && decision !== "suspend" && decision !== "reactivate") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (record.confirm !== true) {
    return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
  }

  const bindingId = typeof record.binding_id === "string" ? record.binding_id.trim() : null;
  const reviewerNotes = typeof record.reviewer_notes === "string" ? record.reviewer_notes.trim() : null;

  const result = await decideBindingProduction({
    decision,
    requestId: decision === "approve" || decision === "reject" ? routeParams.id : null,
    bindingId: decision === "suspend" || decision === "reactivate" ? (bindingId ?? routeParams.id) : null,
    reviewerId: "operator",
    reviewerNotes,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    decision: result.code,
    binding_id: result.binding_id,
    production_status: result.production_status,
    replay: result.replay ?? false,
  });
}
