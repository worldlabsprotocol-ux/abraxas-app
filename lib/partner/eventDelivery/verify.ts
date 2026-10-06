// FILE: lib/partner/eventDelivery/verify.ts
// Re-exports canonical webhook verification from @abraxas/partner-kit/webhooks.

export {
  verifyPartnerWebhookEvent,
  verifyWebhookThenReceipt,
  webhookEventIsNotAuthorizationNotice,
  type PartnerWebhookVerifyError,
  type PartnerWebhookVerifyResult,
} from "@abraxas/partner-kit/webhooks";

import type { PartnerWebhookPayload } from "@/lib/partner/webhooks/types";
import { isPartnerPublicEventType } from "@/lib/partner/eventDelivery/contract";
import { toPublicPartnerEventType } from "@/lib/partner/eventDelivery/mapping";

export function publicEventTypeFromPayload(payload: PartnerWebhookPayload): string | null {
  if (isPartnerPublicEventType(payload.event_type)) return payload.event_type;
  return toPublicPartnerEventType(payload.event_type);
}
