// FILE: app/api/admin/partners/webhooks/delivery-health/route.ts
// Admin delivery health summary for partner webhooks.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import { getWebhookDeliveryHealth } from "@/lib/partner/webhooks/webhookOutbox";
import { webhookHealthLabel } from "@/lib/partner/webhooks/types";

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const counts = await getWebhookDeliveryHealth();
  return NextResponse.json({
    counts,
    labels: Object.fromEntries(
      Object.entries(counts).map(([status, count]) => [status, { count, label: webhookHealthLabel(status as keyof typeof counts) }]),
    ),
  });
}
