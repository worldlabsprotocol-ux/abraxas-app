// FILE: app/api/admin/partners/webhooks/observability/route.ts
// Read-only Production-sensitive webhook delivery observability.

import { NextRequest, NextResponse } from "next/server";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import {
  getPartnerWebhookDeliveryAttempts,
  getPartnerWebhookObservability,
  validateObservabilityEventId,
  validateObservabilityPartnerId,
} from "@/lib/partner/webhooks/webhookOperatorObservability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partnerValidation = validateObservabilityPartnerId(
    req.nextUrl.searchParams.get("partner_id") ?? "",
  );
  if (!partnerValidation.ok) {
    return NextResponse.json({ error: "partner_id required" }, { status: 400 });
  }

  const eventIdParam = req.nextUrl.searchParams.get("event_id");
  if (eventIdParam?.trim()) {
    const eventValidation = validateObservabilityEventId(eventIdParam);
    if (!eventValidation.ok) {
      return NextResponse.json({ error: "event_id invalid" }, { status: 400 });
    }

    const attempts = await getPartnerWebhookDeliveryAttempts({
      partnerId: partnerValidation.value,
      eventId: eventValidation.value,
    });

    if (!attempts) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, attempts });
  }

  const observability = await getPartnerWebhookObservability(partnerValidation.value);
  if (!observability) {
    return NextResponse.json({ error: "Observability unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, observability });
}
