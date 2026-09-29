// FILE: app/api/admin/pilot-evidence/route.ts
// Operator pilot evidence view for investor/customer diligence prep.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { loadPartnerPilotSummary, parsePilotTimeWindow } from "@/lib/partner/pilotEvidence/loadContext";
import { pilotEvidenceLeaks, PILOT_EVIDENCE_NOTICE } from "@/lib/partner/pilotEvidence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const applicationId = req.nextUrl.searchParams.get("application_id")?.trim() ?? "";
  const partnerIdParam = req.nextUrl.searchParams.get("partner_id")?.trim() ?? "";
  if (!applicationId) {
    return NextResponse.json({ error: "application_id_required" }, { status: 400 });
  }

  const sb = requireSupabaseAdmin();
  const { data: app, error } = await sb
    .from("partner_launchpad_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  if (error || !app) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }
  if (partnerIdParam && app.partner_id !== partnerIdParam) {
    return NextResponse.json({ error: "partner_mismatch" }, { status: 403 });
  }

  const { from, to, environment: envParam } = parsePilotTimeWindow(req.nextUrl.searchParams);
  const environment = envParam ?? (app.environment === "production" ? "production" : "sandbox");

  const summary = await loadPartnerPilotSummary({
    application: app,
    environment,
    from,
    to,
  });

  const payload = { ok: true, notice: PILOT_EVIDENCE_NOTICE, summary };
  if (pilotEvidenceLeaks(payload).length > 0) {
    return NextResponse.json({ error: "redacted" }, { status: 503 });
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
