// FILE: app/api/admin/operations/scale-readiness/route.ts
// Admin-only scale/operations readiness facts. No sensitive payloads.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import { buildScaleReadinessReport } from "@/lib/operations/scaleReadiness/evaluate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await buildScaleReadinessReport();
  return NextResponse.json(report);
}
