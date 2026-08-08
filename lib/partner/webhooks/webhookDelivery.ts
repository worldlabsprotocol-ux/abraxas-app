// FILE: lib/partner/webhooks/webhookDelivery.ts
// Deliver signed webhook events with bounded exponential retry.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  WEBHOOK_EVENT_ID_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  signWebhookBody,
} from "@/lib/partner/webhooks/webhookSigning";
import { validateWebhookEndpointForDelivery } from "@/lib/partner/webhooks/webhookEndpointValidation";
import {
  claimWebhookOutboxEvent,
  finalizeWebhookOutboxDelivery,
  listDispatchableWebhookEvents,
} from "@/lib/partner/webhooks/webhookOutbox";
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
  deps?: { fetchFn?: typeof fetch },
): Promise<{ ok: true; httpStatus: number } | { ok: false; errorCode: string; httpStatus?: number }> {
  const endpointCheck = await validateWebhookEndpointForDelivery(endpointUrl);
  if (!endpointCheck.ok) {
    return { ok: false, errorCode: endpointCheck.error };
  }

  const rawBody = JSON.stringify(record.payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signWebhookBody({ secret: signingSecret, timestamp, rawBody });

  const fetchFn = deps?.fetchFn ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetchFn(endpointCheck.deliveryUrl, {
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

function claimScope(record: PartnerWebhookOutboxRecord, workerId: string) {
  if (!record.delivery_claim_id || !record.delivery_lease_until) {
    throw new Error("delivery_claim_missing");
  }
  return {
    outboxId: record.id,
    workerId,
    deliveryClaimId: record.delivery_claim_id,
    deliveryLeaseUntil: record.delivery_lease_until,
  };
}

export async function processWebhookOutboxEvent(
  outboxId: string,
  workerId: string,
): Promise<"delivered" | "retrying" | "failed" | "skipped" | "stale"> {
  const sb = requireSupabaseAdmin();
  const record = await claimWebhookOutboxEvent({ outboxId, workerId });
  if (!record) return "skipped";

  const scope = claimScope(record, workerId);
  const attemptNumber = record.delivery_attempt_number ?? record.attempt_count + 1;

  const config = await loadSigningSecret(record.partner_id);
  if (!config) {
    const finalized = await finalizeWebhookOutboxDelivery({
      ...scope,
      patch: {
        status: "failed",
        last_error_code: "webhook_disabled",
      },
    });
    return finalized ? "failed" : "stale";
  }

  const result = await deliverPartnerWebhookEvent(
    record,
    config.signingSecret,
    config.endpointUrl,
  );

  await sb.from(ATTEMPTS).insert({
    outbox_event_id: record.id,
    partner_id: record.partner_id,
    attempt_number: attemptNumber,
    delivery_claim_id: scope.deliveryClaimId,
    http_status: result.ok ? result.httpStatus : result.httpStatus ?? null,
    error_code: result.ok ? null : result.errorCode,
    duration_ms: null,
  });

  if (result.ok) {
    const finalized = await finalizeWebhookOutboxDelivery({
      ...scope,
      patch: {
        status: "delivered",
        delivered_at: new Date().toISOString(),
        attempt_count: attemptNumber,
        last_error_code: null,
      },
    });
    return finalized ? "delivered" : "stale";
  }

  const failedPermanently = attemptNumber >= WEBHOOK_MAX_ATTEMPTS;
  const finalized = await finalizeWebhookOutboxDelivery({
    ...scope,
    patch: {
      status: failedPermanently ? "failed" : "retrying",
      attempt_count: attemptNumber,
      last_error_code: result.errorCode,
      next_attempt_at: failedPermanently ? record.next_attempt_at : nextAttemptAt(attemptNumber),
    },
  });

  if (!finalized) return "stale";
  return failedPermanently ? "failed" : "retrying";
}

export async function processWebhookOutboxBatch(input?: {
  limit?: number;
  workerId?: string;
}): Promise<{
  scanned: number;
  delivered: number;
  retrying: number;
  failed: number;
  skipped: number;
  stale: number;
}> {
  const { randomUUID } = await import("crypto");
  const workerId = input?.workerId ?? randomUUID();
  const events = await listDispatchableWebhookEvents(input?.limit ?? 25);

  const summary = { scanned: events.length, delivered: 0, retrying: 0, failed: 0, skipped: 0, stale: 0 };
  for (const event of events) {
    const outcome = await processWebhookOutboxEvent(event.id, workerId);
    summary[outcome === "delivered" ? "delivered"
      : outcome === "retrying" ? "retrying"
        : outcome === "failed" ? "failed"
          : outcome === "stale" ? "stale"
            : "skipped"] += 1;
  }
  return summary;
}
