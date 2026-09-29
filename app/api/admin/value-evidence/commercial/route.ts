// FILE: app/api/admin/value-evidence/commercial/route.ts
// Operator-recorded commercial state — never inferred from technical usage.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { upsertCommercialState, validateCommercialStatePatch } from "@/lib/partner/valueEvidence";

export const dynamic = "force-dynamic";

const ALLOWED_PATCH_KEYS = [
  "design_partner_status",
  "commercial_lifecycle_stage",
  "commercial_model_candidate",
  "commercial_model_status",
  "commercial_converted",
  "commercial_declined",
  "commercial_paused",
  "effective_from",
  "operator_note_reference",
] as const;

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

  const patch: Record<string, unknown> = {};
  for (const key of ALLOWED_PATCH_KEYS) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "patch_required" }, { status: 400 });
  }

  const sb = requireSupabaseAdmin();
  const { data: app } = await sb
    .from("partner_launchpad_applications")
    .select("partner_id, production_activated_at")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.partner_id !== partnerId) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }

  const validation = validateCommercialStatePatch({
    patch: patch as Parameters<typeof validateCommercialStatePatch>[0]["patch"],
    productionActivatedAt: app.production_activated_at,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.code }, { status: 409 });
  }

  const operatorActor = await resolveDesignPartnerAdminActorCategory(req);
  try {
    const commercial = await upsertCommercialState({
      applicationId,
      partnerId,
      patch: patch as Parameters<typeof upsertCommercialState>[0]["patch"],
      operatorActor,
      productionActivatedAt: app.production_activated_at,
    });
    return NextResponse.json({ ok: true, commercial }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ error: code }, { status: 409 });
  }
}
