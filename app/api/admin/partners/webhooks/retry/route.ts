// FILE: app/api/admin/partners/webhooks/retry/route.ts
// Admin manual retry for failed webhook deliveries.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import { webhookEndpointFormErrorMessage } from "@/lib/partner/webhooks/webhookEndpointFormValidation";
import { requeueFailedWebhookDelivery } from "@/lib/partner/webhooks/webhookDeadLetter";

export async function POST(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { outbox_id?: string };
  if (!body.outbox_id?.trim()) {
    return NextResponse.json({ error: "outbox_id required" }, { status: 400 });
  }

  const result = await requeueFailedWebhookDelivery({
    outboxId: body.outbox_id.trim(),
    retriedBy: "admin",
  });

  if (!result.ok) {
    return NextResponse.json({
      error: result.error,
      message: webhookEndpointFormErrorMessage(result.error),
    }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    event_id: result.event_id,
    message: "Delivery requeued with the same event ID. No new receipt or billable event was created.",
  });
}
