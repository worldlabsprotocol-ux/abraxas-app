// FILE: app/api/admin/design-partners/pilot/route.ts
// Start or close pilot evaluation period.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { loadProgram, updateProgram } from "@/lib/partner/designPartnerProgram";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const applicationId = String(body.application_id ?? "").trim();
  const partnerId = String(body.partner_id ?? "").trim();
  const action = String(body.action ?? "").trim();
  if (!applicationId || !partnerId || !["start", "close"].includes(action)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const sb = requireSupabaseAdmin();
  const { data: app } = await sb.from("partner_launchpad_applications").select("partner_id").eq("id", applicationId).maybeSingle();
  if (!app || app.partner_id !== partnerId) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }

  const existing = await loadProgram(applicationId);
  if (!existing) return NextResponse.json({ error: "program_not_found" }, { status: 404 });

  const operatorActor = await resolveDesignPartnerAdminActorCategory(req);
  const now = new Date().toISOString();
  const program = await updateProgram({
    applicationId,
    partnerId,
    patch: action === "start"
      ? { pilot_started_at: now, program_status: "pilot_live" }
      : { pilot_completed_at: now, program_status: "pilot_complete" },
    operatorActor,
    auditEvent: action === "start" ? "pilot_started" : "pilot_closed",
  });
  return NextResponse.json({ ok: true, program }, { headers: { "Cache-Control": "no-store" } });
}
