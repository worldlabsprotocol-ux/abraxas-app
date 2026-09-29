// FILE: app/api/admin/pilot-evidence/export/route.ts
// Admin-only investor diligence JSON export.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { loadPartnerPilotSummary, parsePilotTimeWindow } from "@/lib/partner/pilotEvidence/loadContext";
import { buildInvestorDiligenceExport } from "@/lib/partner/pilotEvidence";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const applicationId = req.nextUrl.searchParams.get("application_id")?.trim() ?? "";
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

  const { from, to, environment: envParam } = parsePilotTimeWindow(req.nextUrl.searchParams);
  const environment = envParam ?? (app.environment === "production" ? "production" : "sandbox");

  const summary = await loadPartnerPilotSummary({
    application: app,
    environment,
    from,
    to,
  });

  const exported = buildInvestorDiligenceExport(summary);
  if ("ok" in exported && exported.ok === false) {
    return NextResponse.json({ error: exported.code }, { status: 503 });
  }

  return new Response(JSON.stringify(exported, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="pilot-evidence-${app.public_slug}-${environment}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
