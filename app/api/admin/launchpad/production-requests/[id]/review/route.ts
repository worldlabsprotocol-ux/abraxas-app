// FILE: app/api/admin/launchpad/production-requests/[id]/review/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

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

  const sb = requireSupabaseAdmin();
  const { data: requestRow, error: fetchError } = await sb
    .from("partner_production_access_requests")
    .select("id, application_id, partner_id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError || !requestRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await sb
    .from("partner_production_access_requests")
    .update({
      status: decision,
      reviewer_notes: body.reviewer_notes?.trim() || null,
      reviewed_at: now,
    })
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: "Update failed" }, { status: 503 });
  }

  if (decision === "approved") {
    await sb
      .from("partner_launchpad_applications")
      .update({ environment: "production", updated_at: now })
      .eq("id", requestRow.application_id);

    await sb
      .from("partners")
      .update({
        allowed_environments: ["sandbox", "production"],
        updated_at: now,
      })
      .eq("partner_id", requestRow.partner_id);
  }

  return NextResponse.json({ ok: true, status: decision });
}
