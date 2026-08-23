// FILE: lib/partner/webhooks/types.ts
// Partner webhook event types and delivery status.

export const PARTNER_WEBHOOK_EVENT_TYPES = [
  "partner.receipt.issued",
  "partner.receipt.revoked",
  "partner.access.revoked",
  "partner.credential.revoked",
] as const;

export const PARTNER_WEBHOOK_TEST_EVENT_TYPE = "partner.webhook.test" as const;

export type PartnerWebhookEventType = (typeof PARTNER_WEBHOOK_EVENT_TYPES)[number];

export type PartnerWebhookTestEventType = typeof PARTNER_WEBHOOK_TEST_EVENT_TYPE;

export interface PartnerWebhookTestPayload {
  event_id: string;
  event_type: PartnerWebhookTestEventType;
  occurred_at: string;
  partner_id: string;
  test: true;
}

export const PARTNER_WEBHOOK_STATUSES = [
  "pending",
  "delivering",
  "delivered",
  "retrying",
  "failed",
] as const;

export type PartnerWebhookStatus = (typeof PARTNER_WEBHOOK_STATUSES)[number];

export interface PartnerWebhookPayload {
  event_id: string;
  event_type: PartnerWebhookEventType;
  occurred_at: string;
  partner_id: string;
  policy_id?: string | null;
  receipt_id?: string | null;
  decision_id?: string | null;
  reason_code?: string | null;
}

export interface PartnerWebhookConfigRecord {
  partner_id: string;
  endpoint_url: string;
  signing_secret_prefix: string;
  enabled: boolean;
  secret_revealed_at: string | null;
  created_at: string;
  updated_at: string;
  enabled_at: string | null;
  last_rotated_at: string | null;
}

export interface PartnerWebhookOutboxRecord {
  id: string;
  partner_id: string;
  event_type: PartnerWebhookEventType;
  event_id: string;
  idempotency_key: string;
  payload: PartnerWebhookPayload;
  occurred_at: string;
  status: PartnerWebhookStatus;
  attempt_count: number;
  next_attempt_at: string;
  delivered_at: string | null;
  last_error_code: string | null;
  delivery_lease_until: string | null;
  delivery_worker_id: string | null;
  delivery_claim_id: string | null;
  delivery_attempt_number: number | null;
  created_at: string;
  updated_at: string;
}

export const WEBHOOK_RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  4 * 60 * 60_000,
] as const;

export const WEBHOOK_MAX_ATTEMPTS = WEBHOOK_RETRY_DELAYS_MS.length + 1;

/** Lease duration while a worker holds an outbox event in `delivering`. */
export const WEBHOOK_DELIVERY_LEASE_MS = 5 * 60_000;

export function isPartnerWebhookEventType(value: string): value is PartnerWebhookEventType {
  return (PARTNER_WEBHOOK_EVENT_TYPES as readonly string[]).includes(value);
}

export function webhookHealthLabel(status: PartnerWebhookStatus): string {
  switch (status) {
    case "pending": return "Pending";
    case "delivering": return "Delivering";
    case "delivered": return "Delivered";
    case "retrying": return "Retrying";
    case "failed": return "Failed";
    default: return status;
  }
}
