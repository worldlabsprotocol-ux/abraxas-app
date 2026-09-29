// FILE: app/api/admin/integration-diagnostics/route.ts
// Operator lookup for privacy-safe integration timelines.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { buildIntegrationTimeline, integrationObservabilityLeaks } from "@/lib/partner/integrationObservability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const applicationId = req.nextUrl.searchParams.get("application_id")?.trim() ?? "";
  const requestId = req.nextUrl.searchParams.get("request_id")?.trim() ?? "";
  const receiptId = req.nextUrl.searchParams.get("receipt_id")?.trim() ?? "";
  if (!applicationId && !requestId && !receiptId) {
    return NextResponse.json({ error: "lookup_required" }, { status: 400 });
  }

  const sb = requireSupabaseAdmin();
  let partnerId = req.nextUrl.searchParams.get("partner_id")?.trim() ?? "";
  if (applicationId && !partnerId) {
    const { data: app } = await sb
      .from("partner_launchpad_applications")
      .select("partner_id")
      .eq("id", applicationId)
      .maybeSingle();
    partnerId = String(app?.partner_id ?? "");
  }
  if (!partnerId && receiptId) {
    const { data: event } = await sb
      .from("partner_integration_events")
      .select("partner_id, application_id")
      .eq("receipt_id", receiptId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    partnerId = String(event?.partner_id ?? "");
    if (!applicationId && event?.application_id) {
      return buildTimelineResponse(partnerId, String(event.application_id), requestId || undefined, receiptId || undefined);
    }
  }
  if (!partnerId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return buildTimelineResponse(partnerId, applicationId || undefined, requestId || undefined, receiptId || undefined);
}

async function buildTimelineResponse(
  partnerId: string,
  applicationId?: string,
  requestId?: string,
  receiptId?: string,
) {
  const timeline = await buildIntegrationTimeline({
    partnerId,
    applicationId,
    requestId,
    receiptId,
  });
  if (!timeline.ok) {
    return NextResponse.json({ error: timeline.code }, { status: 404 });
  }
  if (integrationObservabilityLeaks(timeline).length > 0) {
    return NextResponse.json({ error: "redacted" }, { status: 503 });
  }
  return NextResponse.json(timeline, { headers: { "Cache-Control": "no-store" } });
}
