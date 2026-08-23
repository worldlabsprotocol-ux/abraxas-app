// FILE: app/api/partner/webhooks/test-delivery/route.ts
// Sandbox-only atomic webhook test delivery enqueue — queued, not delivered.

import { NextRequest, NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/partner/partnerAuth";
import {
  getWebhookTestDeliveryReadiness,
  isSandboxPartnerApiKey,
  partnerHasWebhooksReadScope,
} from "@/lib/partner/webhooks/webhookOperatorReadiness";
import { enqueuePartnerWebhookTestDelivery } from "@/lib/partner/webhooks/webhookTestDelivery";

export const dynamic = "force-dynamic";

const QUEUED_MESSAGE =
  "Test delivery queued. Delivery is asynchronous; confirm receipt in your handler and via delivery history.";

export async function POST(req: NextRequest) {
  const auth = await authenticatePartner(req, "webhooks:read");
  if (!auth) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isSandboxPartnerApiKey(auth.ctx.keyPrefix)) {
    return NextResponse.json({ error: "Sandbox API key required" }, { status: 403 });
  }

  if (!partnerHasWebhooksReadScope(auth.ctx.scopes)) {
    return NextResponse.json({ error: "Missing scope: webhooks:read" }, { status: 403 });
  }

  const partnerId = auth.ctx.partnerId;
  const readiness = await getWebhookTestDeliveryReadiness(partnerId);
  if (!readiness.test_delivery_available) {
    return NextResponse.json(
      { error: "Webhook test delivery unavailable", code: "test_delivery_unavailable" },
      { status: 503 },
    );
  }

  const result = await enqueuePartnerWebhookTestDelivery(partnerId);
  if (!result.ok) {
    if (result.code === "rate_limited") {
      const headers: Record<string, string> = {};
      if (result.retryAfterSec) {
        headers["Retry-After"] = String(result.retryAfterSec);
      }
      return NextResponse.json(
        { error: "Rate limit exceeded", code: "rate_limited" },
        { status: 429, headers },
      );
    }

    if (result.code === "webhook_disabled" || result.code === "partner_not_found") {
      return NextResponse.json(
        { error: "Webhook test delivery unavailable", code: "test_delivery_unavailable" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Webhook test delivery unavailable", code: "test_delivery_unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    queued: true,
    event_id: result.eventId,
    message: QUEUED_MESSAGE,
  });
}
