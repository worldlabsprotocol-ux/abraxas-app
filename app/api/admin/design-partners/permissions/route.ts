// FILE: app/api/admin/design-partners/permissions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { upsertCaseStudyPermissions } from "@/lib/partner/designPartnerProgram";

export const dynamic = "force-dynamic";

const PERMISSION_KEYS = [
  "company_name_permission",
  "quote_permission",
  "metrics_permission",
  "logo_permission",
  "public_case_study_permission",
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

  const sb = requireSupabaseAdmin();
  const { data: app } = await sb.from("partner_launchpad_applications").select("partner_id").eq("id", applicationId).maybeSingle();
  if (!app || app.partner_id !== partnerId) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }

  const patch: Record<string, "pending" | "approved" | "denied"> = {};
  for (const key of PERMISSION_KEYS) {
    const val = String(body[key] ?? "").trim();
    if (val === "pending" || val === "approved" || val === "denied") patch[key] = val;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "patch_required" }, { status: 400 });
  }

  const operatorActor = await resolveDesignPartnerAdminActorCategory(req);
  const permissions = await upsertCaseStudyPermissions({
    applicationId,
    partnerId,
    patch,
    operatorActor,
  });
  return NextResponse.json({ ok: true, permissions }, { headers: { "Cache-Control": "no-store" } });
}
