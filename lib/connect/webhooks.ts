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

export const WEBHOOK_REPLAY_WINDOW_MS = 5 * 60 * 1000;

export function signWebhookPayload(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");
}

export function verifyWebhookPayload(
  secret: string,
  timestamp: string,
  body: string,
  signature: string,
  nowMs = Date.now(),
): { ok: true } | { ok: false; reason: string } {
  const ts = Date.parse(timestamp);
  if (Number.isNaN(ts)) return { ok: false, reason: "invalid_timestamp" };
  if (Math.abs(nowMs - ts) > WEBHOOK_REPLAY_WINDOW_MS) {
    return { ok: false, reason: "timestamp_outside_window" };
  }

  const expected = signWebhookPayload(secret, timestamp, body);
  if (signature !== expected) return { ok: false, reason: "invalid_signature" };
  return { ok: true };
}

function assertDispatchTimestampFresh(timestamp: string, nowMs = Date.now()): void {
  const ts = Date.parse(timestamp);
  if (Number.isNaN(ts)) throw new Error("Webhook timestamp invalid");
  if (Math.abs(nowMs - ts) > WEBHOOK_REPLAY_WINDOW_MS) {
    throw new Error("Webhook timestamp outside replay window");
  }
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
  const timestamp = new Date().toISOString();
  assertDispatchTimestampFresh(timestamp);

  const payload: ConnectWebhookPayload = {
    event: "authorization.completed",
    event_id: eventId,
    authorization_request_id: input.authorizationId,
    status: input.status,
    receipt_id: input.receiptId,
    reason_codes: input.reasonCodes,
    timestamp,
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
      const signature = signWebhookPayload(endpoint.signing_secret as string, timestamp, body);
      const res = await fetch(endpoint.url as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Abraxas-Signature": signature,
          "X-Abraxas-Timestamp": timestamp,
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
