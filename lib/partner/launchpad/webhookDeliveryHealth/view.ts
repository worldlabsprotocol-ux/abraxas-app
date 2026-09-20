// FILE: lib/partner/launchpad/webhookDeliveryHealth/view.ts
// Pure partner-safe projection. Client fields are never authority.

import { PARTNER_PRODUCTION_PUBLIC_EVENT_TYPES } from "@/lib/partner/eventDelivery/contract";
import { toPartnerVisibleEventLabel } from "@/lib/partner/eventDelivery/mapping";
import {
  WEBHOOK_DELIVERY_HEALTH_DISCLAIMER,
  WEBHOOK_DELIVERY_HEALTH_NOTICE,
  WEBHOOK_DELIVERY_HEALTH_VERSION,
  WEBHOOK_DELIVERY_HEALTH_WINDOW_HOURS,
  WEBHOOK_HEALTH_DOCS,
  WEBHOOK_HEALTH_LOCAL_CHECKLIST,
  WEBHOOK_HEALTH_MAX_ATTEMPTS,
  webhookHealthTestConsoleHref,
  type WebhookHealthCapabilityState,
  type WebhookHealthFailureClass,
  type WebhookHealthHostClass,
  type WebhookHealthRetryState,
  type WebhookHealthStatus,
} from "./contract";
import type { WebhookHealthDeliveryScope } from "./scope";
import {
  WEBHOOK_HEALTH_APP_POLICY_EXPLANATION,
  WEBHOOK_HEALTH_APP_POLICY_LABEL,
  WEBHOOK_HEALTH_PARTNER_WIDE_EXPLANATION,
  WEBHOOK_HEALTH_PARTNER_WIDE_LABEL,
} from "./scope";
import {
  classifyWebhookEndpointHost,
  classifyWebhookFailureClass,
  mapOutboxStatusToHealth,
  opaqueDeliveryRef,
} from "./classify";

export interface WebhookHealthOutboxRow {
  outbox_id: string;
  event_type: string;
  status: string;
  occurred_at: string;
  delivered_at: string | null;
  last_error_code: string | null;
}

export interface WebhookDeliveryHealthView {
  version: typeof WEBHOOK_DELIVERY_HEALTH_VERSION;
  application_id: string;
  delivery_scope: WebhookHealthDeliveryScope;
  scope_label: typeof WEBHOOK_HEALTH_APP_POLICY_LABEL | typeof WEBHOOK_HEALTH_PARTNER_WIDE_LABEL;
  scope_explanation: string;
  webhook_configured: boolean;
  signing_secret_configured: boolean;
  delivery_enabled: boolean;
  host_class: WebhookHealthHostClass;
  masked_host: string | null;
  event_types: string[];
  capability_state: WebhookHealthCapabilityState;
  window_hours: number;
  counts: Record<WebhookHealthStatus, number>;
  last_delivery_at: string | null;
  last_failure_class: WebhookHealthFailureClass | null;
  retry: {
    state: WebhookHealthRetryState;
    max_attempts: number;
    bounded: true;
  };
  deliveries: Array<{
    delivery_ref: string;
    event_type: string;
    status: WebhookHealthStatus;
    occurred_at: string;
    delivered_at: string | null;
    failure_class: WebhookHealthFailureClass | null;
  }>;
  notice: string;
  disclaimer: string;
  checklist: typeof WEBHOOK_HEALTH_LOCAL_CHECKLIST;
  links: {
    test_console: string;
    starter_kit: string;
    event_delivery_docs: string;
    integration_studio: string;
  };
  next_actions: string[];
}

export function buildWebhookDeliveryHealthView(input: {
  applicationId: string;
  partnerId: string;
  webhookConfigured: boolean;
  signingSecretConfigured: boolean;
  deliveryEnabled: boolean;
  endpointUrl?: string | null;
  retryReady: boolean;
  schemaReady: boolean;
  deliveries: WebhookHealthOutboxRow[];
  deliveryScope: WebhookHealthDeliveryScope;
}): WebhookDeliveryHealthView {
  const host = classifyWebhookEndpointHost(input.endpointUrl);
  const capability_state: WebhookHealthCapabilityState = input.webhookConfigured
    ? (input.deliveryEnabled && input.signingSecretConfigured ? "configured" : "incomplete")
    : "optional_not_selected";

  const counts: Record<WebhookHealthStatus, number> = {
    delivered: 0,
    failed: 0,
    pending: 0,
    disabled: 0,
  };
  if (!input.deliveryEnabled) counts.disabled = input.webhookConfigured ? 1 : 0;

  const deliveries = input.deliveries.map((row) => {
    const status = mapOutboxStatusToHealth(row.status, input.deliveryEnabled);
    counts[status] += 1;
    return {
      delivery_ref: opaqueDeliveryRef(input.partnerId, row.outbox_id),
      event_type: toPartnerVisibleEventLabel(row.event_type),
      status,
      occurred_at: row.occurred_at,
      delivered_at: row.delivered_at,
      failure_class: classifyWebhookFailureClass(row.last_error_code),
    };
  });

  const lastDelivered = deliveries.find((row) => row.status === "delivered");
  const lastFailed = deliveries.find((row) => row.failure_class);

  const retryState: WebhookHealthRetryState = !input.schemaReady
    ? "unavailable"
    : input.retryReady && input.deliveryEnabled
      ? "ready"
      : "waiting";

  const appScoped = input.deliveryScope === "app_policy";
  const next_actions: string[] = [];
  if (capability_state === "optional_not_selected") {
    next_actions.push("Webhooks are optional. Add them in Integration Studio if this partner path needs them.");
  } else if (capability_state === "incomplete") {
    next_actions.push("Finish webhook setup in Partner Event Delivery, then generate a Starter Kit.");
  }
  if (counts.failed > 0) {
    next_actions.push("Check endpoint availability, verify server-side signature logic, and inspect the local HMAC fixture.");
    next_actions.push("Contact your technical owner if the endpoint still rejects signed notifications.");
  }

  return {
    version: WEBHOOK_DELIVERY_HEALTH_VERSION,
    application_id: input.applicationId,
    delivery_scope: input.deliveryScope,
    scope_label: appScoped ? WEBHOOK_HEALTH_APP_POLICY_LABEL : WEBHOOK_HEALTH_PARTNER_WIDE_LABEL,
    scope_explanation: appScoped ? WEBHOOK_HEALTH_APP_POLICY_EXPLANATION : WEBHOOK_HEALTH_PARTNER_WIDE_EXPLANATION,
    webhook_configured: input.webhookConfigured,
    signing_secret_configured: input.signingSecretConfigured,
    delivery_enabled: input.deliveryEnabled,
    host_class: host.host_class,
    masked_host: host.masked_host,
    event_types: [...PARTNER_PRODUCTION_PUBLIC_EVENT_TYPES],
    capability_state,
    window_hours: WEBHOOK_DELIVERY_HEALTH_WINDOW_HOURS,
    counts,
    last_delivery_at: lastDelivered?.delivered_at ?? lastDelivered?.occurred_at ?? null,
    last_failure_class: lastFailed?.failure_class ?? null,
    retry: {
      state: retryState,
      max_attempts: WEBHOOK_HEALTH_MAX_ATTEMPTS,
      bounded: true,
    },
    deliveries,
    notice: WEBHOOK_DELIVERY_HEALTH_NOTICE,
    disclaimer: WEBHOOK_DELIVERY_HEALTH_DISCLAIMER,
    checklist: WEBHOOK_HEALTH_LOCAL_CHECKLIST,
    links: {
      test_console: webhookHealthTestConsoleHref(input.applicationId),
      starter_kit: WEBHOOK_HEALTH_DOCS.starter_kit,
      event_delivery_docs: WEBHOOK_HEALTH_DOCS.event_delivery,
      integration_studio: WEBHOOK_HEALTH_DOCS.integration_studio,
    },
    next_actions,
  };
}
