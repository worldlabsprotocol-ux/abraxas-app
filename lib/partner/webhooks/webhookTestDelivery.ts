// FILE: lib/partner/webhooks/webhookTestDelivery.ts
// Atomic sandbox webhook test enqueue via migration 067 RPC only.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

const WEBHOOK_TEST_RPC = "enqueue_partner_webhook_test_delivery";

export type WebhookTestEnqueueCode =
  | "partner_id_required"
  | "partner_not_found"
  | "webhook_disabled"
  | "rate_limited"
  | "enqueue_failed"
  | "enqueue_unavailable";

export type WebhookTestEnqueueResult =
  | { ok: true; queued: true; eventId: string }
  | { ok: false; code: WebhookTestEnqueueCode; retryAfterSec?: number };

interface RpcBody {
  ok?: boolean;
  queued?: boolean;
  event_id?: string;
  code?: string;
  retry_after_sec?: number;
}

function mapRpcCode(code: string | undefined): WebhookTestEnqueueCode {
  switch (code) {
    case "partner_id_required":
    case "partner_not_found":
    case "webhook_disabled":
    case "rate_limited":
    case "enqueue_failed":
      return code;
    default:
      return "enqueue_failed";
  }
}

export async function enqueuePartnerWebhookTestDelivery(
  partnerId: string,
): Promise<WebhookTestEnqueueResult> {
  const trimmed = partnerId.trim();
  if (!trimmed) {
    return { ok: false, code: "partner_id_required" };
  }

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc(WEBHOOK_TEST_RPC, { p_partner_id: trimmed });

  if (error) {
    return { ok: false, code: "enqueue_unavailable" };
  }

  const body = data as RpcBody;
  if (body.ok === true && body.queued === true && typeof body.event_id === "string") {
    return { ok: true, queued: true, eventId: body.event_id };
  }

  return {
    ok: false,
    code: mapRpcCode(body.code),
    retryAfterSec: typeof body.retry_after_sec === "number" ? body.retry_after_sec : undefined,
  };
}
