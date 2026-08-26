// FILE: app/api/admin/design-partners/pilot-summary/route.ts
// Read-only promoted design-partner pilot execution summaries.

import { NextRequest, NextResponse } from "next/server";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import { loadPilotSummaries } from "@/lib/admin/designPartnerPilotSummaryLoader";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await loadPilotSummaries();
    return NextResponse.json(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : "load_failed";
    if (message === "supabase_not_configured") {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to load pilot summaries" }, { status: 500 });
  }
}
