import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPartnerWebhookPortalStatus,
  buildWebhookSandboxBlockedReasons,
  keyEnvironment,
} from "@/lib/partner/partnerWebhookPortalStatus";
import type { WebhookTestDeliveryReadiness } from "@/lib/partner/webhooks/webhookOperatorReadiness";

const readyReadiness: WebhookTestDeliveryReadiness = {
  webhook_schema_062_ready: true,
  webhook_schema_063_ready: true,
  webhook_test_events_supported: true,
  webhook_delivery_enabled: true,
  webhook_dispatch_configured: true,
  webhook_signing_capable: true,
  test_delivery_available: true,
};

describe("partnerWebhookPortalStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps key prefix to environment", () => {
    expect(keyEnvironment("abx_test_abc")).toBe("sandbox");
    expect(keyEnvironment("abx_live_abc")).toBe("production");
  });

  it("includes test_enqueue_not_ready when migration 067 RPC probe fails", () => {
    const reasons = buildWebhookSandboxBlockedReasons({
      webhookConfigured: true,
      webhookDeliveryEnabled: true,
      readiness: {
        ...readyReadiness,
        webhook_test_events_supported: false,
        test_delivery_available: false,
      },
      hasWebhooksReadScope: true,
      isSandboxKey: true,
    });

    expect(reasons).toContain("test_enqueue_not_ready");
  });

  it("builds partner-safe status without partner_id, endpoint, or secrets", () => {
    const status = buildPartnerWebhookPortalStatus({
      keyPrefix: "abx_test_abc",
      scopes: ["webhooks:read"],
      webhookConfigured: true,
      webhookDeliveryEnabled: true,
      readiness: readyReadiness,
    });

    expect(status.sandbox_test.available).toBe(true);
    expect(status.key_environment).toBe("sandbox");
    expect(status.has_webhooks_read_scope).toBe(true);

    const serialized = JSON.stringify(status);
    expect(serialized).not.toContain("partner_id");
    expect(serialized).not.toContain("endpoint_url");
    expect(serialized).not.toMatch(/https:\/\//);
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("whsec");
    expect(serialized).not.toContain("CRON");
    expect(serialized).not.toContain("SQLSTATE");
  });

  it("marks sandbox test unavailable for live keys and missing scope", () => {
    const liveStatus = buildPartnerWebhookPortalStatus({
      keyPrefix: "abx_live_abc",
      scopes: ["webhooks:read"],
      webhookConfigured: true,
      webhookDeliveryEnabled: true,
      readiness: readyReadiness,
    });

    expect(liveStatus.sandbox_test.available).toBe(false);
    expect(liveStatus.sandbox_test.blocked_reasons).toContain("sandbox_key_required");

    const noScopeStatus = buildPartnerWebhookPortalStatus({
      keyPrefix: "abx_test_abc",
      scopes: ["verify:credential"],
      webhookConfigured: true,
      webhookDeliveryEnabled: true,
      readiness: readyReadiness,
    });

    expect(noScopeStatus.sandbox_test.available).toBe(false);
    expect(noScopeStatus.sandbox_test.blocked_reasons).toContain("missing_webhooks_read_scope");
  });

  it("exposes only relative API route links in endpoints", () => {
    const status = buildPartnerWebhookPortalStatus({
      keyPrefix: "abx_test_abc",
      scopes: ["webhooks:read"],
      webhookConfigured: true,
      webhookDeliveryEnabled: true,
      readiness: readyReadiness,
    });

    expect(status.endpoints.status).toBe("/api/partner/webhooks/status");
    expect(status.endpoints.delivery_history).toBe("/api/v1/partner/webhooks/deliveries");
    expect(status.endpoints.sandbox_test_enqueue).toBe("/api/partner/webhooks/test-delivery");
    expect(JSON.stringify(status.endpoints)).not.toContain("https://partner");
  });
});
