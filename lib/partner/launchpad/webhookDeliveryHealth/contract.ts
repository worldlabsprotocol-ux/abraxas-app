// FILE: lib/partner/launchpad/webhookDeliveryHealth/contract.ts
// Partner-visible webhook delivery health. Notification only. No live send.

import { INTEGRATION_STUDIO_PATH } from "@/lib/partner/integrationStudio/contract";
import { PARTNER_EVENT_NOT_AUTHORIZATION } from "@/lib/partner/eventDelivery/contract";
import { launchpadSandboxTestHref } from "@/lib/partner/launchpad/sandboxTestConsole/contract";
import { WEBHOOK_MAX_ATTEMPTS } from "@/lib/partner/webhooks/types";

export const WEBHOOK_DELIVERY_HEALTH_VERSION = "1.1.0" as const;
export const WEBHOOK_DELIVERY_HEALTH_WINDOW_HOURS = 72 as const;
export const WEBHOOK_DELIVERY_HEALTH_LIST_LIMIT = 20 as const;

export const WEBHOOK_DELIVERY_HEALTH_NOTICE =
  "A received webhook is a notification only. Re-fetch and server-verify the current receipt before granting access. Delivery status does not grant eligibility or Production access.";

export const WEBHOOK_DELIVERY_HEALTH_DISCLAIMER = PARTNER_EVENT_NOT_AUTHORIZATION;

export const WEBHOOK_HEALTH_HOST_CLASSES = [
  "not_configured",
  "public_https",
  "local_dev",
  "private_network",
  "unknown",
] as const;
export type WebhookHealthHostClass = (typeof WEBHOOK_HEALTH_HOST_CLASSES)[number];

export const WEBHOOK_HEALTH_STATUSES = [
  "delivered",
  "failed",
  "pending",
  "disabled",
] as const;
export type WebhookHealthStatus = (typeof WEBHOOK_HEALTH_STATUSES)[number];

export const WEBHOOK_HEALTH_FAILURE_CLASSES = [
  "endpoint_unavailable",
  "endpoint_rejected",
  "timeout",
  "delivery_disabled",
  "delivery_failed",
] as const;
export type WebhookHealthFailureClass = (typeof WEBHOOK_HEALTH_FAILURE_CLASSES)[number];

export const WEBHOOK_HEALTH_CAPABILITY_STATES = [
  "configured",
  "incomplete",
  "optional_not_selected",
] as const;
export type WebhookHealthCapabilityState = (typeof WEBHOOK_HEALTH_CAPABILITY_STATES)[number];

export const WEBHOOK_HEALTH_RETRY_STATES = [
  "ready",
  "waiting",
  "unavailable",
] as const;
export type WebhookHealthRetryState = (typeof WEBHOOK_HEALTH_RETRY_STATES)[number];

export const WEBHOOK_HEALTH_DOCS = {
  starter_kit: "/docs/starter-kit",
  event_delivery: "/docs/partner-event-delivery",
  integration_studio: INTEGRATION_STUDIO_PATH,
  partner_flow: "/docs/partner-flow",
} as const;

export function webhookHealthTestConsoleHref(applicationId: string): string {
  return `${launchpadSandboxTestHref(applicationId)}&capability=webhooks`;
}

export const WEBHOOK_HEALTH_LOCAL_CHECKLIST = [
  {
    id: "verify_signature",
    title: "Verify the webhook signature",
    detail: "Use the sandbox test console HMAC fixture locally. Do not send a live test webhook from this panel.",
  },
  {
    id: "refetch_receipt",
    title: "Re-fetch the current receipt",
    detail: "Call the public receipt endpoint on your server and verify the signature and currently_valid flag.",
  },
  {
    id: "apply_action",
    title: "Apply the named partner action",
    detail: "Only then apply the action this policy allows. Delivery health is not eligibility.",
  },
] as const;

export const WEBHOOK_HEALTH_MAX_ATTEMPTS = WEBHOOK_MAX_ATTEMPTS;

export const WEBHOOK_HEALTH_LEAK_PATTERN =
  /abx_(test|live|whsec)_|eyJ[A-Za-z0-9_-]{8,}|receipt_id|0x[a-f0-9]{20,}|wallet_address|SQLSTATE|authorization:\s|x-abraxas-signature|hmac/i;
