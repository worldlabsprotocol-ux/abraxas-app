// FILE: lib/connect/webhooks.ts
// Signed webhook delivery with idempotency and audit trail.

import { createHmac, randomBytes } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export interface ConnectWebhookPayload {
  event: string;
  event_id: string;
  authorization_request_id: string;
  status: string;
  receipt_id: string | null;
  reason_codes: string[];
  timestamp: string;
}

function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

export async function dispatchConnectWebhook(input: {
  partnerId: string;
  authorizationId: string;
  status: string;
  receiptId: string | null;
  reasonCodes: string[];
}): Promise<void> {
  const sb = requireSupabaseAdmin();
  const { data: endpoints } = await sb
    .from("partner_webhook_endpoints")
    .select("*")
    .eq("partner_id", input.partnerId)
    .eq("status", "active");

  if (!endpoints?.length) return;

  const eventId = `evt_${randomBytes(8).toString("hex")}`;
  const payload: ConnectWebhookPayload = {
    event: "authorization.completed",
    event_id: eventId,
    authorization_request_id: input.authorizationId,
    status: input.status,
    receipt_id: input.receiptId,
    reason_codes: input.reasonCodes,
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  for (const endpoint of endpoints) {
    const idempotencyKey = `${eventId}:${endpoint.id as string}`;
    const { data: delivery } = await sb.from("partner_webhook_deliveries").insert({
      endpoint_id: endpoint.id as string,
      event_id: eventId,
      authorization_id: input.authorizationId,
      payload,
      idempotency_key: idempotencyKey,
      status: "pending",
    }).select("id").maybeSingle();

    if (!delivery) continue;

    try {
      const signature = signPayload(endpoint.signing_secret as string, body);
      const res = await fetch(endpoint.url as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Abraxas-Signature": signature,
          "X-Abraxas-Event-Id": eventId,
        },
        body,
      });

      await sb.from("partner_webhook_deliveries").update({
        status: res.ok ? "delivered" : "failed",
        attempt_count: 1,
        last_error: res.ok ? null : `HTTP ${res.status}`,
        delivered_at: res.ok ? new Date().toISOString() : null,
      }).eq("id", delivery.id as string);
    } catch (e) {
      await sb.from("partner_webhook_deliveries").update({
        status: "failed",
        attempt_count: 1,
        last_error: e instanceof Error ? e.message : "delivery_failed",
      }).eq("id", delivery.id as string);
    }
  }
}

export { signPayload as signWebhookPayloadForTest };
