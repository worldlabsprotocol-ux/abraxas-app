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
import {
  WEBHOOK_HEALTH_APP_POLICY_LABEL,
  WEBHOOK_HEALTH_PARTNER_WIDE_LABEL,
  extractOutboxPolicyId,
  partitionWebhookHealthDeliveries,
} from "@/lib/partner/launchpad/webhookDeliveryHealth/scope";

const partnerId = "partner-a";
const selectedPolicy = "policy-app-1";

function attributed(overrides: Partial<{
  outbox_id: string;
  event_type: string;
  status: string;
  occurred_at: string;
  delivered_at: string | null;
  last_error_code: string | null;
  policy_id: string | null;
}> = {}) {
  return {
    outbox_id: "out-match",
    event_type: "partner.receipt.issued",
    status: "delivered",
    occurred_at: "2026-09-20T00:00:00.000Z",
    delivered_at: "2026-09-20T00:00:04.000Z",
    last_error_code: null,
    policy_id: selectedPolicy,
    ...overrides,
  };
}

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
    deliveryScope: "app_policy",
    ...overrides,
  });
}

describe("webhook delivery health attribution", () => {
  it("includes only selected-app policy matches as this app’s policy deliveries", () => {
    const partitioned = partitionWebhookHealthDeliveries({
      selectedPolicyId: selectedPolicy,
      policyFieldReadable: true,
      rows: [
        attributed(),
        attributed({ outbox_id: "out-other", policy_id: "policy-other", status: "failed" }),
        attributed({ outbox_id: "out-missing", policy_id: null, status: "failed" }),
        attributed({ outbox_id: "out-blank", policy_id: "  ", status: "failed" }),
      ],
    });
    expect(partitioned.delivery_scope).toBe("app_policy");
    expect(partitioned.scope_label).toBe(WEBHOOK_HEALTH_APP_POLICY_LABEL);
    expect(partitioned.rows.map((row) => row.outbox_id)).toEqual(["out-match"]);
    const built = view({
      webhookConfigured: true,
      signingSecretConfigured: true,
      deliveryEnabled: true,
      deliveries: partitioned.rows,
      deliveryScope: partitioned.delivery_scope,
    });
    expect(built.counts.delivered).toBe(1);
    expect(built.counts.failed).toBe(0);
    expect(built.scope_label).toBe(WEBHOOK_HEALTH_APP_POLICY_LABEL);
    expect(JSON.stringify(built)).toContain("This app");
  });

  it("excludes different-policy rows from app-specific counts", () => {
    const partitioned = partitionWebhookHealthDeliveries({
      selectedPolicyId: selectedPolicy,
      policyFieldReadable: true,
      rows: [attributed({ outbox_id: "out-other", policy_id: "other-policy", status: "delivered" })],
    });
    expect(partitioned.rows).toEqual([]);
    const built = view({ deliveries: partitioned.rows, deliveryScope: "app_policy" });
    expect(built.counts.delivered).toBe(0);
    expect(built.deliveries).toEqual([]);
  });

  it("never represents missing-policy rows as selected-app delivery", () => {
    expect(extractOutboxPolicyId(undefined)).toBeNull();
    expect(extractOutboxPolicyId({})).toBeNull();
    expect(extractOutboxPolicyId({ policy_id: "" })).toBeNull();
    expect(extractOutboxPolicyId({ policy_id: "   " })).toBeNull();
    expect(extractOutboxPolicyId({ policy_id: selectedPolicy })).toBe(selectedPolicy);

    const partitioned = partitionWebhookHealthDeliveries({
      selectedPolicyId: selectedPolicy,
      policyFieldReadable: true,
      rows: [attributed({ outbox_id: "out-missing", policy_id: null, status: "delivered" })],
    });
    expect(partitioned.delivery_scope).toBe("app_policy");
    expect(partitioned.rows).toEqual([]);
  });

  it("labels unread policy fields as partner-wide, not this app", () => {
    const partitioned = partitionWebhookHealthDeliveries({
      selectedPolicyId: selectedPolicy,
      policyFieldReadable: false,
      rows: [attributed({ outbox_id: "out-unknown", policy_id: null, status: "failed" })],
    });
    expect(partitioned.delivery_scope).toBe("partner_wide");
    expect(partitioned.scope_label).toBe(WEBHOOK_HEALTH_PARTNER_WIDE_LABEL);
    expect(partitioned.rows).toHaveLength(1);
    const built = view({
      deliveries: partitioned.rows,
      deliveryScope: "partner_wide",
      webhookConfigured: true,
      signingSecretConfigured: true,
      deliveryEnabled: true,
    });
    expect(built.scope_explanation).toMatch(/not this app/i);
    expect(built.scope_label).not.toMatch(/this app/i);
    expect(built.counts.failed).toBe(1);
  });
});

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
    expect(JSON.stringify(empty)).not.toMatch(/https:\/\/hooks\.|abx_whsec_|receipt_id|payload/);
  });

  it("shows configured health without secrets, full URLs, payload, or receipt ids", () => {
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
    expect(JSON.stringify(configured)).not.toContain("payload");
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
