// FILE: app/api/admin/design-partners/decision/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { recordDecision, deriveTechnicalOutcome, evaluateAllCriteria, listCriteria } from "@/lib/partner/designPartnerProgram";
import { buildApplicationValueEvidence } from "@/lib/partner/valueEvidence";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const applicationId = String(body.application_id ?? "").trim();
  const partnerId = String(body.partner_id ?? "").trim();
  const decisionStatus = String(body.decision_status ?? "").trim();
  if (!applicationId || !partnerId) {
    return NextResponse.json({ error: "application_id_and_partner_id_required" }, { status: 400 });
  }
  if (!["converted", "not_converted", "extended", "paused", "pending"].includes(decisionStatus)) {
    return NextResponse.json({ error: "invalid_decision_status" }, { status: 400 });
  }

  const sb = requireSupabaseAdmin();
  const { data: app } = await sb.from("partner_launchpad_applications").select("*").eq("id", applicationId).maybeSingle();
  if (!app || app.partner_id !== partnerId) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }

  if (decisionStatus === "converted" && !app.production_activated_at) {
    return NextResponse.json({ error: "converted_requires_production_active" }, { status: 409 });
  }

  const valueEvidence = await buildApplicationValueEvidence({ application: app });
  const criteria = await listCriteria(applicationId);
  const evaluated = evaluateAllCriteria({
    criteria,
    pilotSandbox: valueEvidence.pilot_sandbox,
    pilotProduction: valueEvidence.pilot_production,
    valueEvidence,
  });
  const technicalOutcome = deriveTechnicalOutcome(evaluated);
  const reasonCodes = Array.isArray(body.reason_codes)
    ? body.reason_codes.map(String)
    : [];

  const operatorActor = await resolveDesignPartnerAdminActorCategory(req);
  const program = await recordDecision({
    applicationId,
    partnerId,
    decisionStatus: decisionStatus as "converted" | "not_converted" | "extended" | "paused" | "pending",
    reasonCodes,
    operatorSummary: body.operator_summary ? String(body.operator_summary).slice(0, 500) : null,
    technicalOutcome,
    operatorActor,
    productionActivatedAt: app.production_activated_at,
  });
  return NextResponse.json({ ok: true, program, technical_outcome: technicalOutcome }, { headers: { "Cache-Control": "no-store" } });
}
