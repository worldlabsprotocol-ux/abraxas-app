// FILE: lib/partner/eventDelivery/index.ts
export {
  PARTNER_EVENT_SCHEMA_VERSION,
  PARTNER_PUBLIC_EVENT_TYPES,
  PARTNER_PRODUCTION_PUBLIC_EVENT_TYPES,
  PARTNER_EXTENDED_PUBLIC_EVENT_TYPES,
  PARTNER_EVENT_OUTCOMES,
  PARTNER_VISIBLE_DELIVERY_STATES,
  PARTNER_EVENT_SIGNATURE_METADATA,
  PARTNER_EVENT_ALLOWED_KEYS,
  PARTNER_EVENT_PII_FORBIDDEN_KEYS,
  PARTNER_EVENT_ENDPOINT_REQUIREMENTS,
  PARTNER_EVENT_NOT_AUTHORIZATION,
  isPartnerPublicEventType,
  outcomeForPublicEventType,
  type PartnerPublicEventType,
  type PartnerEventOutcome,
  type PartnerVisibleDeliveryState,
} from "@/lib/partner/eventDelivery/contract";

export {
  toPublicPartnerEventType,
  toStoredWebhookEventType,
  toPartnerVisibleEventLabel,
  toPartnerVisibleDeliveryState,
  partnerDeliveryIsRedeliverable,
  recommendPartnerActionChannel,
} from "@/lib/partner/eventDelivery/mapping";

export {
  LAUNCHPAD_WEBHOOK_PUBLIC_FAILURE_CODES,
  toLaunchpadWebhookPublicFailureCode,
  EVENT_TYPE_NOT_SUPPORTED,
  PRODUCTION_COMPATIBLE_EVENT_LABEL,
  type LaunchpadWebhookPublicFailureCode,
} from "@/lib/partner/eventDelivery/publicFailure";

export {
  verifyPartnerWebhookEvent,
  verifyWebhookThenReceipt,
  webhookEventIsNotAuthorizationNotice,
  publicEventTypeFromPayload,
} from "@/lib/partner/eventDelivery/verify";

export {
  nextjsWebhookHandlerExample,
  expressWebhookHandlerExample,
} from "@/lib/partner/eventDelivery/examples";
