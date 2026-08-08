// FILE: lib/partner/webhooks/webhookDelivery.ts
// Deliver signed webhook events with bounded exponential retry.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  WEBHOOK_EVENT_ID_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  signWebhookBody,
} from "@/lib/partner/webhooks/webhookSigning";
import { mapOutboxRow } from "@/lib/partner/webhooks/webhookOutbox";
import type { PartnerWebhookOutboxRecord } from "@/lib/partner/webhooks/types";
import { WEBHOOK_MAX_ATTEMPTS, WEBHOOK_RETRY_DELAYS_MS } from "@/lib/partner/webhooks/types";

const OUTBOX = "partner_webhook_outbox";
const ATTEMPTS = "partner_webhook_delivery_attempts";
const CONFIG = "partner_webhook_configs";

function nextAttemptAt(attemptCount: number): string {
  const delay = WEBHOOK_RETRY_DELAYS_MS[Math.max(0, attemptCount - 1)] ?? WEBHOOK_RETRY_DELAYS_MS.at(-1)!;
  return new Date(Date.now() + delay).toISOString();
}

async function loadSigningSecret(partnerId: string): Promise<{
  endpointUrl: string;
  signingSecret: string;
} | null> {
  const { loadPartnerWebhookSigningSecret } = await import("@/lib/partner/webhooks/webhookConfigService");
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from(CONFIG)
    .select("endpoint_url, enabled")
    .eq("partner_id", partnerId)
    .maybeSingle();

  if (!data?.enabled) return null;
  const signingSecret = await loadPartnerWebhookSigningSecret(partnerId);
  if (!signingSecret) return null;

  return {
    endpointUrl: data.endpoint_url as string,
    signingSecret,
  };
}

export async function deliverPartnerWebhookEvent(
  record: PartnerWebhookOutboxRecord,
  signingSecret: string,
  endpointUrl: string,
): Promise<{ ok: true; httpStatus: number } | { ok: false; errorCode: string; httpStatus?: number }> {
  const rawBody = JSON.stringify(record.payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signWebhookBody({ secret: signingSecret, timestamp, rawBody });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const started = Date.now();

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [WEBHOOK_EVENT_ID_HEADER]: record.event_id,
        [WEBHOOK_TIMESTAMP_HEADER]: timestamp,
        [WEBHOOK_SIGNATURE_HEADER]: signature,
      },
      body: rawBody,
      redirect: "manual",
      signal: controller.signal,
    });

    const durationMs = Date.now() - started;
    const responseSnippet = (await response.text().catch(() => "")).slice(0, 240);

    if (response.status >= 300 && response.status < 400) {
      return { ok: false, errorCode: "redirect_not_allowed", httpStatus: response.status };
    }

    if (!response.ok) {
      return {
        ok: false,
        errorCode: `http_${response.status}`,
        httpStatus: response.status,
      };
    }

    return { ok: true, httpStatus: response.status };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "delivery_failed";
    return { ok: false, errorCode: msg.includes("abort") ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function processWebhookOutboxEvent(
  outboxId: string,
): Promise<"delivered" | "retrying" | "failed" | "skipped"> {
  const sb = requireSupabaseAdmin();
  const { data: locked } = await sb
    .from(OUTBOX)
    .update({ status: "delivering", updated_at: new Date().toISOString() })
    .eq("id", outboxId)
    .in("status", ["pending", "retrying"])
    .select("*")
    .maybeSingle();

  if (!locked) return "skipped";
  const record = mapOutboxRow(locked);

  const config = await loadSigningSecret(record.partner_id);
  if (!config) {
    await sb.from(OUTBOX).update({
      status: "failed",
      last_error_code: "webhook_disabled",
      updated_at: new Date().toISOString(),
    }).eq("id", outboxId);
    return "failed";
  }

  const attemptNumber = record.attempt_count + 1;
  const result = await deliverPartnerWebhookEvent(
    record,
    config.signingSecret,
    config.endpointUrl,
  );

  await sb.from(ATTEMPTS).insert({
    outbox_event_id: record.id,
    partner_id: record.partner_id,
    attempt_number: attemptNumber,
    http_status: result.ok ? result.httpStatus : result.httpStatus ?? null,
    error_code: result.ok ? null : result.errorCode,
    duration_ms: null,
  });

  if (result.ok) {
    await sb.from(OUTBOX).update({
      status: "delivered",
      delivered_at: new Date().toISOString(),
      attempt_count: attemptNumber,
      last_error_code: null,
      updated_at: new Date().toISOString(),
    }).eq("id", outboxId);
    return "delivered";
  }

  const failedPermanently = attemptNumber >= WEBHOOK_MAX_ATTEMPTS;
  await sb.from(OUTBOX).update({
    status: failedPermanently ? "failed" : "retrying",
    attempt_count: attemptNumber,
    last_error_code: result.errorCode,
    next_attempt_at: failedPermanently ? record.next_attempt_at : nextAttemptAt(attemptNumber),
    updated_at: new Date().toISOString(),
  }).eq("id", outboxId);

  return failedPermanently ? "failed" : "retrying";
}

export async function processWebhookOutboxBatch(input?: {
  limit?: number;
}): Promise<{
  scanned: number;
  delivered: number;
  retrying: number;
  failed: number;
  skipped: number;
}> {
  const { listDispatchableWebhookEvents } = await import("@/lib/partner/webhooks/webhookOutbox");
  const events = await listDispatchableWebhookEvents(input?.limit ?? 25);

  const summary = { scanned: events.length, delivered: 0, retrying: 0, failed: 0, skipped: 0 };
  for (const event of events) {
    const outcome = await processWebhookOutboxEvent(event.id);
    summary[outcome === "delivered" ? "delivered"
      : outcome === "retrying" ? "retrying"
        : outcome === "failed" ? "failed"
          : "skipped"] += 1;
  }
  return summary;
}
