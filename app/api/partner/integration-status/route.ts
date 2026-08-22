// FILE: app/api/partner/integration-status/route.ts
// Partner-authenticated own-partner integration wiring status — read-only.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import { getPartnerIntegrationStatus } from "@/lib/partner/partnerIntegrationStatus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticatePartner(req);
  if (!auth) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Partner identity is derived only from the authenticated API key context.
  // Any partner_id query or body input is intentionally ignored.
  const integrationStatus = await getPartnerIntegrationStatus(
    auth.ctx.partnerId,
    auth.ctx.keyPrefix,
  );

  if (!integrationStatus) {
    return NextResponse.json({ error: "Integration status unavailable" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    integration_status: integrationStatus,
  });
}
