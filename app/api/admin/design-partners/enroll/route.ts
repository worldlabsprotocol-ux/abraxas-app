// FILE: app/api/admin/design-partners/enroll/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { enrollProgram } from "@/lib/partner/designPartnerProgram";

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
  const { data: app } = await sb.from("partner_launchpad_applications").select("partner_id, policy_template_id").eq("id", applicationId).maybeSingle();
  if (!app || app.partner_id !== partnerId) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }

  const operatorActor = await resolveDesignPartnerAdminActorCategory(req);
  const program = await enrollProgram({
    applicationId,
    partnerId,
    primaryUseCase: body.primary_use_case ? String(body.primary_use_case) : null,
    initialPolicyPack: body.initial_policy_pack ? String(body.initial_policy_pack) : app.policy_template_id,
    pilotEnvironment: body.pilot_environment === "production" ? "production" : "sandbox",
    targetDecisionDate: body.target_decision_date ? String(body.target_decision_date) : null,
    operatorActor,
  });
  return NextResponse.json({ ok: true, program }, { headers: { "Cache-Control": "no-store" } });
}
