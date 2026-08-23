// FILE: app/api/partner/webhooks/status/route.ts
// Partner-authenticated webhook portal status — read-only, no secrets or callback URL.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import { getPartnerWebhookPortalStatus } from "@/lib/partner/partnerWebhookPortalStatus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticatePartner(req);
  if (!auth) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const webhookStatus = await getPartnerWebhookPortalStatus({
    partnerId: auth.ctx.partnerId,
    keyPrefix: auth.ctx.keyPrefix,
    scopes: auth.ctx.scopes,
  });

  if (!webhookStatus) {
    return NextResponse.json({ error: "Webhook status unavailable" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    webhook_status: webhookStatus,
  });
}
