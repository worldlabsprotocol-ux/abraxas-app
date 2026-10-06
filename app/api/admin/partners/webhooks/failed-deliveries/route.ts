// FILE: app/api/admin/partners/webhooks/failed-deliveries/route.ts
// Admin failed webhook deliveries (non-PII metadata only).

import { NextRequest, NextResponse } from "next/server";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import { listFailedWebhookDeliveries } from "@/lib/partner/webhooks/webhookDeadLetter";

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partnerId = req.nextUrl.searchParams.get("partner_id") ?? undefined;
  const deliveries = await listFailedWebhookDeliveries({
    partnerId,
    limit: 50,
  });

  return NextResponse.json({ deliveries });
}
