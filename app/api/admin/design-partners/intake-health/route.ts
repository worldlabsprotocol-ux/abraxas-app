// FILE: app/api/admin/design-partners/intake-health/route.ts
// Read-only design-partner intake configuration health for authorized admins.

import { NextRequest, NextResponse } from "next/server";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import { buildDesignPartnerIntakeHealthReport } from "@/lib/integrations/designPartnerIntakeHealth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = buildDesignPartnerIntakeHealthReport();
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }
}
