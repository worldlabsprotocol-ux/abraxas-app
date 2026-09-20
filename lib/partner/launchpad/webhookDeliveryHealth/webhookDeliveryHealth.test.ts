import { describe, expect, it } from "vitest";
import { launchpadSandboxTestHref } from "@/lib/partner/launchpad/sandboxTestConsole/contract";
import {
  classifyWebhookEndpointHost,
  classifyWebhookFailureClass,
  opaqueDeliveryRef,
  webhookHealthCopyLeaks,
} from "@/lib/partner/launchpad/webhookDeliveryHealth/classify";
import { buildWebhookDeliveryHealthView } from "@/lib/partner/launchpad/webhookDeliveryHealth/view";
import {
  WEBHOOK_DELIVERY_HEALTH_NOTICE,
  WEBHOOK_HEALTH_DOCS,
  webhookHealthTestConsoleHref,
} from "@/lib/partner/launchpad/webhookDeliveryHealth/contract";

const partnerId = "partner-a";

function view(overrides: Partial<Parameters<typeof buildWebhookDeliveryHealthView>[0]> = {}) {
  return buildWebhookDeliveryHealthView({
    applicationId: "app-1",
    partnerId,
    webhookConfigured: false,
    signingSecretConfigured: false,
    deliveryEnabled: false,
    endpointUrl: null,
    retryReady: false,
    schemaReady: true,
    deliveries: [],
    scopedByApplicationPolicy: true,
    ...overrides,
  });
}

describe("webhook delivery health view", () => {
  it("shows a leak-free empty optional state", () => {
    const empty = view();
    expect(empty.capability_state).toBe("optional_not_selected");
    expect(empty.webhook_configured).toBe(false);
    expect(empty.counts.delivered).toBe(0);
    expect(empty.links.integration_studio).toBe(WEBHOOK_HEALTH_DOCS.integration_studio);
    expect(empty.links.starter_kit).toBe(WEBHOOK_HEALTH_DOCS.starter_kit);
    expect(empty.notice).toBe(WEBHOOK_DELIVERY_HEALTH_NOTICE);
    expect(webhookHealthCopyLeaks(JSON.stringify(empty))).toEqual([]);
    expect(JSON.stringify(empty)).not.toMatch(/https:\/\/hooks\.|abx_whsec_|receipt_id/);
  });

  it("shows configured health without secrets, full URLs, or receipt ids", () => {
    const configured = view({
      webhookConfigured: true,
      signingSecretConfigured: true,
      deliveryEnabled: true,
      endpointUrl: "https://hooks.partner.example/webhooks/abraxas?token=secret",
      retryReady: true,
      deliveries: [{
        outbox_id: "out-1",
        event_type: "partner.receipt.issued",
        status: "delivered",
        occurred_at: "2026-09-20T00:00:00.000Z",
        delivered_at: "2026-09-20T00:00:04.000Z",
        last_error_code: null,
      }],
    });
    expect(configured.capability_state).toBe("configured");
    expect(configured.host_class).toBe("public_https");
    expect(configured.masked_host).toBe("*.partner.example");
    expect(configured.counts.delivered).toBe(1);
    expect(configured.deliveries[0]?.delivery_ref).toBe(opaqueDeliveryRef(partnerId, "out-1"));
    expect(configured.deliveries[0]?.event_type).toBe("receipt.issued");
    expect(JSON.stringify(configured)).not.toContain("hooks.partner.example/webhooks");
    expect(JSON.stringify(configured)).not.toContain("abx_whsec_");
    expect(JSON.stringify(configured)).not.toContain("token=secret");
    expect(webhookHealthCopyLeaks(JSON.stringify(configured))).toEqual([]);
  });

  it("shows failed delivery class and recovery actions", () => {
    const failed = view({
      webhookConfigured: true,
      signingSecretConfigured: true,
      deliveryEnabled: true,
      endpointUrl: "https://api.example/hooks",
      deliveries: [{
        outbox_id: "out-fail",
        event_type: "partner.receipt.issued",
        status: "failed",
        occurred_at: "2026-09-20T00:00:00.000Z",
        delivered_at: null,
        last_error_code: "http_500",
      }],
    });
    expect(failed.counts.failed).toBe(1);
    expect(failed.last_failure_class).toBe("endpoint_rejected");
    expect(failed.next_actions.join(" ")).toMatch(/signature|HMAC|technical owner/i);
    expect(JSON.stringify(failed)).not.toContain("http_500");
    expect(webhookHealthCopyLeaks(JSON.stringify(failed))).toEqual([]);
  });

  it("links the sandbox HMAC fixture and does not include a send action", () => {
    const configured = view({ webhookConfigured: true, signingSecretConfigured: true, deliveryEnabled: true });
    expect(configured.links.test_console).toBe(webhookHealthTestConsoleHref("app-1"));
    expect(configured.links.test_console).toContain(launchpadSandboxTestHref("app-1"));
    expect(configured.links.test_console).toContain("capability=webhooks");
    expect(JSON.stringify(configured)).not.toMatch(/Send TEST EVENT|TEST EVENT queued/i);
    expect(configured.checklist.map((item) => item.id)).toEqual([
      "verify_signature",
      "refetch_receipt",
      "apply_action",
    ]);
  });

  it("classifies hosts and failures without leaking raw codes", () => {
    expect(classifyWebhookEndpointHost("http://127.0.0.1:3000/cb").host_class).toBe("local_dev");
    expect(classifyWebhookEndpointHost("https://10.0.0.4/hook").host_class).toBe("private_network");
    expect(classifyWebhookFailureClass("timeout")).toBe("timeout");
    expect(classifyWebhookFailureClass("SQLSTATE 42P01")).toBe("delivery_failed");
  });
});
