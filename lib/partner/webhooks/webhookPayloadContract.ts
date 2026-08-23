// FILE: lib/partner/webhooks/webhookPayloadContract.ts
// Non-PII webhook payload contract.

import type {
  PartnerWebhookEventType,
  PartnerWebhookPayload,
  PartnerWebhookTestPayload,
} from "@/lib/partner/webhooks/types";
import { PARTNER_WEBHOOK_TEST_EVENT_TYPE } from "@/lib/partner/webhooks/types";

export const WEBHOOK_PAYLOAD_ALLOWED_KEYS = [
  "event_id",
  "event_type",
  "occurred_at",
  "partner_id",
  "policy_id",
  "receipt_id",
  "decision_id",
  "reason_code",
] as const;

export const WEBHOOK_TEST_PAYLOAD_ALLOWED_KEYS = [
  "event_id",
  "event_type",
  "occurred_at",
  "partner_id",
  "test",
] as const;

export const WEBHOOK_TEST_PAYLOAD_FORBIDDEN_KEYS = [
  "policy_id",
  "receipt_id",
  "decision_id",
  "reason_code",
] as const;

export const WEBHOOK_PII_FORBIDDEN_KEYS = [
  "email",
  "oauth_sub",
  "wallet",
  "wallet_address",
  "sui_address",
  "subject_id",
  "subject_sui",
  "claims",
  "claims_json",
  "credential_jwt",
  "jwt",
  "document",
  "selfie",
  "biometric",
  "storage_path",
  "admin_note",
  "reviewer_note",
] as const;

export const WEBHOOK_NOTIFICATION_DISCLAIMER =
  "Webhook notifications are not proof of access. Re-fetch the public receipt and validate currently_valid before granting access.";

export function buildPartnerWebhookPayload(input: {
  eventId: string;
  eventType: PartnerWebhookEventType;
  occurredAt: string;
  partnerId: string;
  policyId?: string | null;
  receiptId?: string | null;
  decisionId?: string | null;
  reasonCode?: string | null;
}): PartnerWebhookPayload {
  const payload: PartnerWebhookPayload = {
    event_id: input.eventId,
    event_type: input.eventType,
    occurred_at: input.occurredAt,
    partner_id: input.partnerId,
  };

  if (input.policyId) payload.policy_id = input.policyId;
  if (input.receiptId) payload.receipt_id = input.receiptId;
  if (input.decisionId) payload.decision_id = input.decisionId;
  if (input.reasonCode) payload.reason_code = input.reasonCode;

  return payload;
}

export function webhookPayloadHasNoPii(payload: PartnerWebhookPayload): boolean {
  const text = JSON.stringify(payload).toLowerCase();
  if (text.includes("@")) return false;
  if (text.includes("0x")) return false;

  for (const key of WEBHOOK_PII_FORBIDDEN_KEYS) {
    if (text.includes(key)) return false;
  }

  const keys = Object.keys(payload);
  return keys.every(key => (WEBHOOK_PAYLOAD_ALLOWED_KEYS as readonly string[]).includes(key));
}

export function buildWebhookIdempotencyKey(input: {
  partnerId: string;
  eventType: PartnerWebhookEventType;
  resourceId: string;
}): string {
  return `webhook:${input.partnerId}:${input.eventType}:${input.resourceId}`;
}

export function buildPartnerWebhookTestPayload(input: {
  eventId: string;
  occurredAt: string;
  partnerId: string;
}): PartnerWebhookTestPayload {
  return {
    event_id: input.eventId,
    event_type: PARTNER_WEBHOOK_TEST_EVENT_TYPE,
    occurred_at: input.occurredAt,
    partner_id: input.partnerId,
    test: true,
  };
}

export function webhookTestPayloadIsValid(payload: PartnerWebhookTestPayload): boolean {
  if (payload.test !== true) return false;
  if (payload.event_type !== PARTNER_WEBHOOK_TEST_EVENT_TYPE) return false;

  for (const key of WEBHOOK_TEST_PAYLOAD_FORBIDDEN_KEYS) {
    if (key in payload) return false;
  }

  const keys = Object.keys(payload);
  if (!keys.every(key => (WEBHOOK_TEST_PAYLOAD_ALLOWED_KEYS as readonly string[]).includes(key))) {
    return false;
  }

  const text = JSON.stringify(payload).toLowerCase();
  if (text.includes("@")) return false;
  if (text.includes("0x")) return false;

  for (const key of WEBHOOK_PII_FORBIDDEN_KEYS) {
    if (text.includes(key)) return false;
  }

  return true;
}
