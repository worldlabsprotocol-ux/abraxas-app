// FILE: app/api/admin/value-evidence/icp/route.ts
// Operator ICP learning metadata — minimal, not a CRM.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { upsertIcpProfile } from "@/lib/partner/valueEvidence";

export const dynamic = "force-dynamic";

const ALLOWED_PATCH_KEYS = [
  "industry_category",
  "company_size_band",
  "primary_policy_need",
  "integration_type",
  "initial_use_case",
  "technical_owner_type",
  "compliance_driver",
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
    .select("partner_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.partner_id !== partnerId) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }

  const operatorActor = await resolveDesignPartnerAdminActorCategory(req);
  const icp = await upsertIcpProfile({
    applicationId,
    partnerId,
    patch: patch as Parameters<typeof upsertIcpProfile>[0]["patch"],
    operatorActor,
  });
  return NextResponse.json({ ok: true, icp }, { headers: { "Cache-Control": "no-store" } });
}
