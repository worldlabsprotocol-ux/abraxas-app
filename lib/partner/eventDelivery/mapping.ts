// FILE: lib/partner/eventDelivery/mapping.ts
// Map stored outbox types onto the public Partner Event Delivery contract.

import type { PartnerWebhookEventType, PartnerWebhookStatus } from "@/lib/partner/webhooks/types";
import { WEBHOOK_MAX_ATTEMPTS } from "@/lib/partner/webhooks/types";
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

export function toStoredWebhookEventType(
  publicType: PartnerPublicEventType,
): PartnerWebhookEventType {
  return publicType;
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
