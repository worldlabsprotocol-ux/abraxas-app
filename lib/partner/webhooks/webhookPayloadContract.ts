// FILE: lib/partner/webhooks/webhookPayloadContract.ts
// Non-PII webhook payload contract.

import type {
  PartnerWebhookEventType,
  PartnerWebhookPayload,
  PartnerWebhookTestPayload,
} from "@/lib/partner/webhooks/types";
import { PARTNER_WEBHOOK_TEST_EVENT_TYPE } from "@/lib/partner/webhooks/types";
import {
  PARTNER_EVENT_SCHEMA_VERSION,
  PARTNER_EVENT_SIGNATURE_METADATA,
  outcomeForPublicEventType,
} from "@/lib/partner/eventDelivery/contract";
import { toPublicPartnerEventType } from "@/lib/partner/eventDelivery/mapping";
import { pickAllowedKeys } from "@/lib/privacy/selectiveDisclosure/enforce";
import {
  WEBHOOK_PAYLOAD_ALLOWED_KEYS,
  WEBHOOK_PII_FORBIDDEN_KEYS,
  WEBHOOK_TEST_PAYLOAD_ALLOWED_KEYS,
  WEBHOOK_TEST_PAYLOAD_FORBIDDEN_KEYS,
} from "@/lib/partner/webhooks/payloadAllowlist";

export {
  WEBHOOK_PAYLOAD_ALLOWED_KEYS,
  WEBHOOK_PII_FORBIDDEN_KEYS,
  WEBHOOK_TEST_PAYLOAD_ALLOWED_KEYS,
  WEBHOOK_TEST_PAYLOAD_FORBIDDEN_KEYS,
} from "@/lib/partner/webhooks/payloadAllowlist";

export const WEBHOOK_NOTIFICATION_DISCLAIMER =
  "Webhook notifications are not proof of access. Re-fetch the public receipt and validate currently_valid before granting access.";

export function buildPartnerWebhookPayload(input: {
  eventId: string;
  eventType: PartnerWebhookEventType;
  occurredAt: string;
  partnerId: string;
  policyId?: string | null;
  policyVersion?: number | null;
  receiptId?: string | null;
  decisionId?: string | null;
  reasonCode?: string | null;
  outcome?: string | null;
  eventRef?: string | null;
  validityClass?: string | null;
  expiresAt?: string | null;
  mustReverify?: true;
  isGrant?: false;
}): PartnerWebhookPayload {
  const publicType = toPublicPartnerEventType(input.eventType);
  const outcome = input.outcome
    ?? (publicType ? outcomeForPublicEventType(publicType) : null);

  const payload: PartnerWebhookPayload = {
    event_id: input.eventId,
    schema_version: PARTNER_EVENT_SCHEMA_VERSION,
    event_type: publicType ?? input.eventType,
    timestamp: input.occurredAt,
    occurred_at: input.occurredAt,
    partner_id: input.partnerId,
    policy_id: input.policyId ?? null,
    policy_version: typeof input.policyVersion === "number" ? input.policyVersion : null,
    outcome,
    signature: { ...PARTNER_EVENT_SIGNATURE_METADATA },
    must_reverify: true,
    is_grant: false,
  };

  if (input.receiptId) payload.receipt_id = input.receiptId;
  if (input.decisionId) payload.decision_id = input.decisionId;
  if (input.reasonCode) payload.reason_code = input.reasonCode;
  if (input.eventRef) payload.event_ref = input.eventRef;
  if (input.validityClass) payload.validity_class = input.validityClass;
  if (input.expiresAt) payload.expires_at = input.expiresAt;

  return (pickAllowedKeys(payload, WEBHOOK_PAYLOAD_ALLOWED_KEYS) ?? payload) as unknown as PartnerWebhookPayload;
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
