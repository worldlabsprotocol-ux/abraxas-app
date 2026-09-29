// FILE: app/api/admin/design-partners/accept/route.ts

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
  if (!applicationId || !partnerId) {
    return NextResponse.json({ error: "application_id_and_partner_id_required" }, { status: 400 });
  }

  const sb = requireSupabaseAdmin();
  const { data: app } = await sb.from("partner_launchpad_applications").select("partner_id").eq("id", applicationId).maybeSingle();
  if (!app || app.partner_id !== partnerId) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }

  const existing = await loadProgram(applicationId);
  if (!existing) return NextResponse.json({ error: "program_not_found" }, { status: 404 });

  const operatorActor = await resolveDesignPartnerAdminActorCategory(req);
  const program = await updateProgram({
    applicationId,
    partnerId,
    patch: { program_status: "accepted" },
    operatorActor,
    auditEvent: "design_partner_status_changed",
  });
  return NextResponse.json({ ok: true, program }, { headers: { "Cache-Control": "no-store" } });
}
