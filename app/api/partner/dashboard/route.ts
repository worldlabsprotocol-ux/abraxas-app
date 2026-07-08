// FILE: app/api/partner/dashboard/route.ts
// Partner self-service dashboard — authenticate with abx_ API key.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import { getPartnerDashboard } from "@/lib/partner/partnerDashboard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticatePartner(req);
  if (!auth) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const dashboard = await getPartnerDashboard(
    auth.ctx.partnerId,
    auth.ctx.keyPrefix,
    auth.ctx.displayName,
    auth.ctx.scopes,
  );

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, dashboard });
}
