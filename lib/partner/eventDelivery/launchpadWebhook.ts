// FILE: lib/partner/eventDelivery/launchpadWebhook.ts
// Partner Launchpad self-service webhook setup wrapping existing config and outbox.

import {
  getPartnerWebhookConfig,
  removePartnerWebhookEndpoint,
  rotatePartnerWebhookSigningSecret,
  setPartnerWebhookEnabled,
  upsertPartnerWebhookEndpoint,
} from "@/lib/partner/webhooks/webhookConfigService";
import { listPartnerWebhookDeliveries } from "@/lib/partner/webhooks/webhookOutbox";
import { enqueuePartnerWebhookTestDelivery } from "@/lib/partner/webhooks/webhookTestDelivery";
import { requeueFailedWebhookDelivery } from "@/lib/partner/webhooks/webhookDeadLetter";
import { maybeEnqueueIntegrationHealthChanged } from "@/lib/partner/webhooks/webhookHooks";
import {
  PARTNER_EVENT_ENDPOINT_REQUIREMENTS,
  PARTNER_EVENT_NOT_AUTHORIZATION,
  PARTNER_EVENT_SCHEMA_VERSION,
  PARTNER_EXTENDED_PUBLIC_EVENT_TYPES,
  PARTNER_PRODUCTION_PUBLIC_EVENT_TYPES,
} from "@/lib/partner/eventDelivery/contract";
import {
  partnerDeliveryIsRedeliverable,
  recommendPartnerActionChannel,
  toPartnerVisibleDeliveryState,
  toPartnerVisibleEventLabel,
  toPublicPartnerEventType,
} from "@/lib/partner/eventDelivery/mapping";
import { webhookOutboxSupportsStoredEventType } from "@/lib/partner/eventDelivery/schemaCapability";
import { isWebhookHttpsEndpointWellFormed } from "@/lib/partner/webhooks/webhookEndpointFormValidation";
import {
  EVENT_TYPE_NOT_SUPPORTED,
  PRODUCTION_COMPATIBLE_EVENT_LABEL,
  toLaunchpadWebhookPublicFailureCode,
  type LaunchpadWebhookPublicFailureCode,
} from "@/lib/partner/eventDelivery/publicFailure";

export function maskWebhookEndpoint(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const path = parsed.pathname.length > 24 ? `${parsed.pathname.slice(0, 21)}...` : parsed.pathname;
    return `${parsed.protocol}//${host}${path}`;
  } catch {
    return "configured";
  }
}

export async function getLaunchpadWebhookOverview(input: {
  partnerId: string;
  policyId?: string | null;
  policyVersion?: number | null;
  callbackConfigured: boolean;
}) {
  const config = await getPartnerWebhookConfig(input.partnerId);
  const webhookConfigured = Boolean(config?.endpoint_url?.trim());
  const webhookEnabled = config?.enabled === true;
  const deliveries = webhookConfigured
    ? await listPartnerWebhookDeliveries({ partnerId: input.partnerId, limit: 25 })
    : [];
  const latest = deliveries[0] ?? null;
  const visibleDeliveries = deliveries.map((row) => {
    const visible = toPartnerVisibleDeliveryState({
      status: row.status,
      attempt_count: row.attempt_count,
    });
    return {
      outbox_id: row.outbox_id,
      event_id: row.event_id,
      event_type: toPartnerVisibleEventLabel(String(row.event_type)),
      public_event_type: toPublicPartnerEventType(String(row.event_type)),
      storage_event_type: row.event_type,
      visible_state: visible,
      occurred_at: row.occurred_at,
      delivered_at: row.delivered_at,
      attempt_count: row.attempt_count,
      last_error_code: row.last_error_code,
      redelivery_eligible: partnerDeliveryIsRedeliverable({
        status: row.status,
        webhookEnabled,
      }),
    };
  });

  const extendedAvailable = await webhookOutboxSupportsStoredEventType("receipt.expired");
  const publicEventTypes = extendedAvailable
    ? [...PARTNER_PRODUCTION_PUBLIC_EVENT_TYPES, ...PARTNER_EXTENDED_PUBLIC_EVENT_TYPES]
    : [...PARTNER_PRODUCTION_PUBLIC_EVENT_TYPES];
  const unsupportedLifecycleEvents = extendedAvailable ? [] : [...PARTNER_EXTENDED_PUBLIC_EVENT_TYPES];

  return {
    schema_version: PARTNER_EVENT_SCHEMA_VERSION,
    event_types: publicEventTypes,
    production_event_types: PARTNER_PRODUCTION_PUBLIC_EVENT_TYPES,
    extended_event_types_available: extendedAvailable,
    unsupported_event_types: unsupportedLifecycleEvents,
    unsupported_lifecycle_events: unsupportedLifecycleEvents,
    schema_skip_code: extendedAvailable ? null : EVENT_TYPE_NOT_SUPPORTED,
    production_compatibility: PRODUCTION_COMPATIBLE_EVENT_LABEL,
    compatibility_notice: extendedAvailable
      ? `Production compatibility includes ${PRODUCTION_COMPATIBLE_EVENT_LABEL}. Extended lifecycle events are available on this schema.`
      : `Unsupported lifecycle events: ${unsupportedLifecycleEvents.join(", ")}. Skip code ${EVENT_TYPE_NOT_SUPPORTED}. Production compatibility remains limited to ${PRODUCTION_COMPATIBLE_EVENT_LABEL}.`,
    storage_event_types: ["partner.receipt.issued", "partner.receipt.revoked", "partner.webhook.test"],
    endpoint_requirements: PARTNER_EVENT_ENDPOINT_REQUIREMENTS,
    disclaimer: PARTNER_EVENT_NOT_AUTHORIZATION,
    webhook_configured: webhookConfigured,
    webhook_enabled: webhookEnabled,
    signing_secret_available: Boolean(config?.signing_secret_prefix),
    signing_secret_prefix: config?.signing_secret_prefix ?? null,
    endpoint_display: config?.endpoint_url ? maskWebhookEndpoint(config.endpoint_url) : null,
    delivery_not_guaranteed: true,
    latest_delivery: visibleDeliveries[0] ?? null,
    latest_delivery_status: latest
      ? toPartnerVisibleDeliveryState({ status: latest.status, attempt_count: latest.attempt_count })
      : null,
    delivery_failure_blocker: visibleDeliveries.some(
      (row) => row.visible_state === "failed" || row.visible_state === "dead-lettered",
    ),
    partner_action_channel: recommendPartnerActionChannel({
      webhookConfigured,
      webhookEnabled,
      callbackConfigured: input.callbackConfigured,
    }),
    deliveries: visibleDeliveries,
  };
}

export async function saveLaunchpadWebhookEndpoint(input: {
  partnerId: string;
  endpointUrl: string;
  policyId?: string | null;
  policyVersion?: number | null;
}) {
  const form = isWebhookHttpsEndpointWellFormed(input.endpointUrl);
  if (!form.ok) return { ok: false as const, error: form.error };

  const result = await upsertPartnerWebhookEndpoint({
    partnerId: input.partnerId,
    endpointUrl: input.endpointUrl,
  });
  if (!result.ok) return result;

  maybeEnqueueIntegrationHealthChanged({
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    reasonCode: "endpoint_saved",
  });

  return result;
}

export async function rotateLaunchpadWebhookSecret(partnerId: string) {
  return rotatePartnerWebhookSigningSecret(partnerId);
}

export async function setLaunchpadWebhookEnabled(input: {
  partnerId: string;
  enabled: boolean;
  policyId?: string | null;
  policyVersion?: number | null;
}) {
  const result = await setPartnerWebhookEnabled(input);
  if (result.ok) {
    maybeEnqueueIntegrationHealthChanged({
      partnerId: input.partnerId,
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      reasonCode: input.enabled ? "delivery_enabled" : "delivery_disabled",
    });
  }
  return result;
}

export async function removeLaunchpadWebhookEndpoint(partnerId: string) {
  return removePartnerWebhookEndpoint(partnerId);
}

export async function enqueueLaunchpadWebhookTest(partnerId: string): Promise<
  | { ok: true; queued: true; eventId: string }
  | { ok: false; code: LaunchpadWebhookPublicFailureCode }
> {
  const config = await getPartnerWebhookConfig(partnerId);
  if (!config?.endpoint_url?.trim()) {
    return { ok: false, code: "webhook_not_configured" };
  }
  if (config.enabled !== true) {
    return { ok: false, code: "webhook_disabled" };
  }

  const result = await enqueuePartnerWebhookTestDelivery(partnerId);
  if (!result.ok) {
    return { ok: false, code: toLaunchpadWebhookPublicFailureCode(result.code) };
  }
  return result;
}

export async function redeliverLaunchpadWebhook(input: {
  partnerId: string;
  outboxId: string;
}) {
  return requeueFailedWebhookDelivery({
    outboxId: input.outboxId,
    partnerId: input.partnerId,
    retriedBy: `launchpad:${input.partnerId}`,
  });
}
