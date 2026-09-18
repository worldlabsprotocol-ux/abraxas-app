// FILE: lib/partner/eventDelivery/publicFailure.ts
// Whitelisted Launchpad Event Delivery failure codes. Never pass through Postgres errors.

export const LAUNCHPAD_WEBHOOK_PUBLIC_FAILURE_CODES = [
  "event_type_not_supported",
  "persistence_failed",
  "enqueue_unavailable",
  "webhook_not_configured",
  "webhook_disabled",
] as const;

export type LaunchpadWebhookPublicFailureCode =
  (typeof LAUNCHPAD_WEBHOOK_PUBLIC_FAILURE_CODES)[number];

export const EVENT_TYPE_NOT_SUPPORTED: LaunchpadWebhookPublicFailureCode = "event_type_not_supported";

export const PRODUCTION_COMPATIBLE_EVENT_LABEL =
  "receipt.issued, receipt.revoked, and TEST EVENT";

export function isLaunchpadWebhookPublicFailureCode(
  value: string | null | undefined,
): value is LaunchpadWebhookPublicFailureCode {
  return Boolean(
    value && (LAUNCHPAD_WEBHOOK_PUBLIC_FAILURE_CODES as readonly string[]).includes(value),
  );
}

export function toLaunchpadWebhookPublicFailureCode(
  code: string | null | undefined,
): LaunchpadWebhookPublicFailureCode {
  if (isLaunchpadWebhookPublicFailureCode(code)) return code;
  switch (code) {
    case "webhook_disabled":
      return "webhook_disabled";
    case "partner_id_required":
    case "partner_not_found":
      return "webhook_not_configured";
    case "enqueue_failed":
    case "enqueue_unavailable":
    case "rate_limited":
      return "enqueue_unavailable";
    case "event_type_not_supported":
      return "event_type_not_supported";
    default:
      return "persistence_failed";
  }
}
