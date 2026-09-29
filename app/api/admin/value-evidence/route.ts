// FILE: app/api/admin/value-evidence/route.ts
// Operator value evidence — business proof layer (admin only).

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { parsePilotTimeWindow } from "@/lib/partner/pilotEvidence/loadContext";
import {
  buildApplicationValueEvidence,
  buildPortfolioValueEvidence,
  VALUE_EVIDENCE_NOTICE,
  valueEvidenceLeaks,
} from "@/lib/partner/valueEvidence";
import {
  buildDesignPartnerApplicationView,
  buildDesignPartnerPortfolioView,
  designPartnerLeaks,
  DESIGN_PARTNER_NOTICE,
} from "@/lib/partner/designPartnerProgram";
import { listPrograms } from "@/lib/partner/designPartnerProgram/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const scope = req.nextUrl.searchParams.get("scope")?.trim() ?? "application";
  const { from, to } = parsePilotTimeWindow(req.nextUrl.searchParams);
  const sb = requireSupabaseAdmin();

  if (scope === "portfolio") {
    const partnerId = req.nextUrl.searchParams.get("partner_id")?.trim() ?? "";
    let query = sb.from("partner_launchpad_applications").select("*").order("created_at", { ascending: true });
    if (partnerId) query = query.eq("partner_id", partnerId);
    const { data: applications, error } = await query;
    if (error) {
      return NextResponse.json({ error: "load_failed" }, { status: 503 });
    }
    const portfolio = await buildPortfolioValueEvidence({
      applications: applications ?? [],
      from,
      to,
    });
    const programs = await listPrograms(partnerId || undefined);
    const enrolledIds = new Set(programs.map((p) => p.application_id));
    const designApps = (applications ?? []).filter((a) => enrolledIds.has(a.id));
    const design_partner = await buildDesignPartnerPortfolioView({
      applications: designApps,
      from,
      to,
    });
    const payload = {
      ok: true,
      notice: VALUE_EVIDENCE_NOTICE,
      design_partner_notice: DESIGN_PARTNER_NOTICE,
      scope: "portfolio",
      portfolio,
      design_partner,
    };
    if (valueEvidenceLeaks(payload).length > 0 || designPartnerLeaks(payload).length > 0) {
      return NextResponse.json({ error: "redacted" }, { status: 503 });
    }
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  }

  const applicationId = req.nextUrl.searchParams.get("application_id")?.trim() ?? "";
  if (!applicationId) {
    return NextResponse.json({ error: "application_id_required" }, { status: 400 });
  }

  const { data: app, error } = await sb
    .from("partner_launchpad_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  if (error || !app) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }

  const evidence = await buildApplicationValueEvidence({ application: app, from, to });
  const design_partner = await buildDesignPartnerApplicationView({ application: app, from, to });
  const payload = {
    ok: true,
    notice: VALUE_EVIDENCE_NOTICE,
    design_partner_notice: DESIGN_PARTNER_NOTICE,
    scope: "application",
    evidence,
    design_partner,
  };
  if (valueEvidenceLeaks(payload).length > 0 || designPartnerLeaks(payload).length > 0) {
    return NextResponse.json({ error: "redacted" }, { status: 503 });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
