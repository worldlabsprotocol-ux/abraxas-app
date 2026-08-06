// FILE: app/api/admin/partner-flow/health/route.ts
// Admin-only Partner Flow operational health (last 24h aggregates, no sensitive payloads).

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import { buildPartnerFlowHealthReport } from "@/lib/partner/partnerFlowHealth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await buildPartnerFlowHealthReport(24);
  return NextResponse.json(report);
}
