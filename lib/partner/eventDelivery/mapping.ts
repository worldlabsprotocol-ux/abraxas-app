// FILE: lib/partner/eventDelivery/mapping.ts
// Map stored outbox types onto the public Partner Event Delivery contract.

import type { PartnerWebhookEventType, PartnerWebhookStatus } from "@/lib/partner/webhooks/types";
import {
  PARTNER_WEBHOOK_TEST_EVENT_TYPE,
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_OUTBOX_067_EVENT_TYPES,
  WEBHOOK_OUTBOX_EXTENDED_EVENT_TYPES,
} from "@/lib/partner/webhooks/types";
import type {
  PartnerPublicEventType,
  PartnerVisibleDeliveryState,
} from "@/lib/partner/eventDelivery/contract";
import { isPartnerPublicEventType } from "@/lib/partner/eventDelivery/contract";

export function toPublicPartnerEventType(
  storedType: string,
): PartnerPublicEventType | null {
  if (isPartnerPublicEventType(storedType)) return storedType;
  switch (storedType) {
    case "partner.receipt.issued":
      return "receipt.issued";
    case "partner.receipt.revoked":
    case "partner.access.revoked":
    case "partner.credential.revoked":
      return "receipt.revoked";
    default:
      return null;
  }
}

export function toPartnerVisibleEventLabel(storedType: string): string {
  if (storedType === PARTNER_WEBHOOK_TEST_EVENT_TYPE) return "TEST EVENT";
  return toPublicPartnerEventType(storedType) ?? storedType;
}

export function toStoredWebhookEventType(
  eventType: string,
): PartnerWebhookEventType | typeof PARTNER_WEBHOOK_TEST_EVENT_TYPE | null {
  switch (eventType) {
    case "receipt.issued":
    case "partner.receipt.issued":
      return "partner.receipt.issued";
    case "receipt.revoked":
    case "partner.receipt.revoked":
      return "partner.receipt.revoked";
    case "partner.access.revoked":
      return "partner.access.revoked";
    case "partner.credential.revoked":
      return "partner.credential.revoked";
    case PARTNER_WEBHOOK_TEST_EVENT_TYPE:
      return PARTNER_WEBHOOK_TEST_EVENT_TYPE;
    case "receipt.expired":
      return "receipt.expired";
    case "receipt.expiring":
      return "receipt.expiring";
    case "receipt.invalidated":
      return "receipt.invalidated";
    case "decision.denied":
      return "decision.denied";
    case "integration.health_changed":
      return "integration.health_changed";
    default:
      return null;
  }
}

export function isWebhookOutbox067EventType(value: string): boolean {
  return (WEBHOOK_OUTBOX_067_EVENT_TYPES as readonly string[]).includes(value);
}

export function isWebhookOutboxExtendedEventType(value: string): boolean {
  return (WEBHOOK_OUTBOX_EXTENDED_EVENT_TYPES as readonly string[]).includes(value);
}

export function toPartnerVisibleDeliveryState(input: {
  status: PartnerWebhookStatus | string;
  attempt_count: number;
}): PartnerVisibleDeliveryState {
  if (input.status === "delivered") return "delivered";
  if (input.status === "retrying") return "retrying";
  if (input.status === "failed") {
    return input.attempt_count >= WEBHOOK_MAX_ATTEMPTS ? "dead-lettered" : "failed";
  }
  return "queued";
}

export function partnerDeliveryIsRedeliverable(input: {
  status: PartnerWebhookStatus | string;
  webhookEnabled: boolean;
}): boolean {
  return input.webhookEnabled && input.status === "failed";
}

export function recommendPartnerActionChannel(input: {
  webhookConfigured: boolean;
  webhookEnabled: boolean;
  callbackConfigured: boolean;
}): "webhook" | "callback" | "both" | "none" {
  if (input.webhookEnabled && input.callbackConfigured) return "both";
  if (input.webhookEnabled || input.webhookConfigured) return "webhook";
  if (input.callbackConfigured) return "callback";
  return "none";
}
