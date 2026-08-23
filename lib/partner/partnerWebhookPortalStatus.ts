// FILE: lib/partner/partnerWebhookPortalStatus.ts
// Partner-safe webhook portal status — no callback URL, secrets, or partner_id in responses.

import { getPartnerWebhookConfig } from "@/lib/partner/webhooks/webhookConfigService";
import {
  getWebhookTestDeliveryReadiness,
  isSandboxPartnerApiKey,
  partnerHasWebhooksReadScope,
} from "@/lib/partner/webhooks/webhookOperatorReadiness";
import { WEBHOOK_NOTIFICATION_DISCLAIMER } from "@/lib/partner/webhooks/webhookPayloadContract";
import { PARTNER_WEBHOOK_TEST_EVENT_TYPE } from "@/lib/partner/webhooks/types";
import type { WebhookTestDeliveryReadiness } from "@/lib/partner/webhooks/webhookOperatorReadiness";

export const PARTNER_WEBHOOK_SANDBOX_NOTICE =
  "Sandbox access (abx_test_ keys and sandbox policies) cannot be used for Production access. Receipts with production_usable: false must not gate live user actions.";

export const PARTNER_WEBHOOK_STATUS_ENDPOINT = "/api/partner/webhooks/status";
export const PARTNER_WEBHOOK_DELIVERIES_ENDPOINT = "/api/v1/partner/webhooks/deliveries";
export const PARTNER_WEBHOOK_TEST_DELIVERY_ENDPOINT = "/api/partner/webhooks/test-delivery";

export type WebhookSandboxBlockedReason =
  | "webhook_not_configured"
  | "delivery_not_enabled"
  | "schema_not_ready"
  | "test_enqueue_not_ready"
  | "dispatch_not_ready"
  | "signing_not_ready"
  | "missing_webhooks_read_scope"
  | "sandbox_key_required";

export interface PartnerWebhookPortalStatus {
  key_environment: "sandbox" | "production";
  has_webhooks_read_scope: boolean;
  webhook_configured: boolean;
  webhook_delivery_enabled: boolean;
  sandbox_notice: string;
  sandbox_test: {
    event_type: typeof PARTNER_WEBHOOK_TEST_EVENT_TYPE;
    available: boolean;
    requires_sandbox_key: boolean;
    readiness: {
      schema_ready: boolean;
      test_enqueue_ready: boolean;
      delivery_enabled: boolean;
      dispatch_ready: boolean;
      signing_ready: boolean;
    };
    blocked_reasons: WebhookSandboxBlockedReason[];
  };
  disclaimer: string;
  endpoints: {
    delivery_history: string;
    sandbox_test_enqueue: string;
    status: string;
  };
}

export function keyEnvironment(keyPrefix: string): "sandbox" | "production" {
  return keyPrefix.startsWith("abx_live_") ? "production" : "sandbox";
}

export function buildWebhookSandboxBlockedReasons(input: {
  webhookConfigured: boolean;
  webhookDeliveryEnabled: boolean;
  readiness: WebhookTestDeliveryReadiness;
  hasWebhooksReadScope: boolean;
  isSandboxKey: boolean;
}): WebhookSandboxBlockedReason[] {
  const reasons: WebhookSandboxBlockedReason[] = [];

  if (!input.webhookConfigured) reasons.push("webhook_not_configured");
  if (input.webhookConfigured && !input.webhookDeliveryEnabled) {
    reasons.push("delivery_not_enabled");
  }
  if (!input.readiness.webhook_schema_062_ready || !input.readiness.webhook_schema_063_ready) {
    reasons.push("schema_not_ready");
  }
  if (!input.readiness.webhook_test_events_supported) {
    reasons.push("test_enqueue_not_ready");
  }
  if (!input.readiness.webhook_dispatch_configured) {
    reasons.push("dispatch_not_ready");
  }
  if (!input.readiness.webhook_signing_capable) {
    reasons.push("signing_not_ready");
  }
  if (!input.hasWebhooksReadScope) {
    reasons.push("missing_webhooks_read_scope");
  }
  if (!input.isSandboxKey) {
    reasons.push("sandbox_key_required");
  }

  return reasons;
}

export function buildPartnerWebhookPortalStatus(input: {
  keyPrefix: string;
  scopes: readonly string[];
  webhookConfigured: boolean;
  webhookDeliveryEnabled: boolean;
  readiness: WebhookTestDeliveryReadiness;
}): PartnerWebhookPortalStatus {
  const hasWebhooksReadScope = partnerHasWebhooksReadScope(input.scopes);
  const isSandboxKey = isSandboxPartnerApiKey(input.keyPrefix);
  const schemaReady =
    input.readiness.webhook_schema_062_ready && input.readiness.webhook_schema_063_ready;

  const blockedReasons = buildWebhookSandboxBlockedReasons({
    webhookConfigured: input.webhookConfigured,
    webhookDeliveryEnabled: input.webhookDeliveryEnabled,
    readiness: input.readiness,
    hasWebhooksReadScope,
    isSandboxKey,
  });

  const available =
    input.webhookConfigured
    && input.readiness.test_delivery_available
    && hasWebhooksReadScope
    && isSandboxKey;

  return {
    key_environment: keyEnvironment(input.keyPrefix),
    has_webhooks_read_scope: hasWebhooksReadScope,
    webhook_configured: input.webhookConfigured,
    webhook_delivery_enabled: input.webhookDeliveryEnabled,
    sandbox_notice: PARTNER_WEBHOOK_SANDBOX_NOTICE,
    sandbox_test: {
      event_type: PARTNER_WEBHOOK_TEST_EVENT_TYPE,
      available,
      requires_sandbox_key: true,
      readiness: {
        schema_ready: schemaReady,
        test_enqueue_ready: input.readiness.webhook_test_events_supported,
        delivery_enabled: input.readiness.webhook_delivery_enabled,
        dispatch_ready: input.readiness.webhook_dispatch_configured,
        signing_ready: input.readiness.webhook_signing_capable,
      },
      blocked_reasons: blockedReasons,
    },
    disclaimer: WEBHOOK_NOTIFICATION_DISCLAIMER,
    endpoints: {
      delivery_history: PARTNER_WEBHOOK_DELIVERIES_ENDPOINT,
      sandbox_test_enqueue: PARTNER_WEBHOOK_TEST_DELIVERY_ENDPOINT,
      status: PARTNER_WEBHOOK_STATUS_ENDPOINT,
    },
  };
}

export async function getPartnerWebhookPortalStatus(input: {
  partnerId: string;
  keyPrefix: string;
  scopes: readonly string[];
}): Promise<PartnerWebhookPortalStatus | null> {
  const [config, readiness] = await Promise.all([
    getPartnerWebhookConfig(input.partnerId),
    getWebhookTestDeliveryReadiness(input.partnerId),
  ]);

  const webhookConfigured = Boolean(config?.endpoint_url?.trim());
  const webhookDeliveryEnabled = config?.enabled === true;

  return buildPartnerWebhookPortalStatus({
    keyPrefix: input.keyPrefix,
    scopes: input.scopes,
    webhookConfigured,
    webhookDeliveryEnabled,
    readiness,
  });
}
