// FILE: app/api/admin/value-evidence/feature-requests/route.ts
// Product discipline — classify partner requests without exposing roadmap.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { insertFeatureRequest, type FeatureRequestClassification } from "@/lib/partner/valueEvidence";

export const dynamic = "force-dynamic";

const CLASSIFICATIONS = new Set<FeatureRequestClassification>([
  "core_platform",
  "reusable_policy_capability",
  "partner_configuration",
  "custom_one_off",
  "security_requirement",
  "compliance_requirement",
]);

export async function POST(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const partnerId = String(body.partner_id ?? "").trim();
  const title = String(body.title ?? "").trim();
  const classification = String(body.classification ?? "").trim() as FeatureRequestClassification;
  const requestedByPartner = String(body.requested_by_partner ?? "").trim();
  if (!partnerId || !title || !requestedByPartner) {
    return NextResponse.json({ error: "partner_id_title_and_requested_by_required" }, { status: 400 });
  }
  if (!CLASSIFICATIONS.has(classification)) {
    return NextResponse.json({ error: "invalid_classification" }, { status: 400 });
  }

  const applicationIdRaw = body.application_id;
  const applicationId = applicationIdRaw == null ? null : String(applicationIdRaw).trim() || null;
  if (applicationId) {
    const sb = requireSupabaseAdmin();
    const { data: app } = await sb
      .from("partner_launchpad_applications")
      .select("partner_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (!app || app.partner_id !== partnerId) {
      return NextResponse.json({ error: "application_not_found" }, { status: 404 });
    }
  }

  const reusableRaw = String(body.reusable_across_market ?? "unknown");
  const reusableAcrossMarket = reusableRaw === "yes" || reusableRaw === "no" ? reusableRaw : "unknown";
  const blocksProduction = Boolean(body.blocks_production);

  const operatorActor = await resolveDesignPartnerAdminActorCategory(req);
  const featureRequest = await insertFeatureRequest({
    partnerId,
    applicationId,
    title,
    classification,
    reusableAcrossMarket,
    blocksProduction,
    requestedByPartner,
    operatorActor,
  });
  return NextResponse.json({ ok: true, feature_request: featureRequest }, { headers: { "Cache-Control": "no-store" } });
}
