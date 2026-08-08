// FILE: app/api/v1/partner/webhooks/deliveries/route.ts
// Partner-scoped webhook delivery history.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import { listPartnerWebhookDeliveries } from "@/lib/partner/webhooks/webhookOutbox";
import { WEBHOOK_NOTIFICATION_DISCLAIMER } from "@/lib/partner/webhooks/webhookPayloadContract";

export async function GET(req: NextRequest) {
  const auth = await authenticatePartner(req, "webhooks:read");
  if (!auth) {
    return NextResponse.json({ error: "Partner API key required" }, { status: 401 });
  }
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const deliveries = await listPartnerWebhookDeliveries({
    partnerId: auth.ctx.partnerId,
    limit,
  });

  return NextResponse.json({
    partner_id: auth.ctx.partnerId,
    disclaimer: WEBHOOK_NOTIFICATION_DISCLAIMER,
    deliveries,
  });
}
