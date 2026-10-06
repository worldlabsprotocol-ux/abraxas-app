// FILE: app/api/admin/design-partners/criteria/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { createCriteria, CRITERION_TYPES, type CriterionType } from "@/lib/partner/designPartnerProgram";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const applicationId = String(body.application_id ?? "").trim();
  const partnerId = String(body.partner_id ?? "").trim();
  const criterionType = String(body.criterion_type ?? "").trim() as CriterionType;
  if (!applicationId || !partnerId) {
    return NextResponse.json({ error: "application_id_and_partner_id_required" }, { status: 400 });
  }
  if (!CRITERION_TYPES.includes(criterionType)) {
    return NextResponse.json({ error: "invalid_criterion_type" }, { status: 400 });
  }

  const sb = requireSupabaseAdmin();
  const { data: app } = await sb.from("partner_launchpad_applications").select("partner_id").eq("id", applicationId).maybeSingle();
  if (!app || app.partner_id !== partnerId) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }

  const operatorActor = await resolveDesignPartnerAdminActorCategory(req);
  const criterion = await createCriteria({
    applicationId,
    partnerId,
    criterionType,
    target: (body.target as Record<string, unknown>) ?? {},
    measurementSource: String(body.measurement_source ?? "operator_defined"),
    operatorActor,
  });
  return NextResponse.json({ ok: true, criterion }, { headers: { "Cache-Control": "no-store" } });
}
