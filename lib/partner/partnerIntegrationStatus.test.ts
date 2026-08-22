import { describe, expect, it } from "vitest";
import {
  PARTNER_INTEGRATION_SANDBOX_NOTICE,
  buildPartnerIntegrationStatus,
} from "@/lib/partner/partnerIntegrationStatus";

describe("partnerIntegrationStatus", () => {
  const baseSnapshot = {
    allowedReturnUrlCount: 2,
    assignedPolicyId: "policy-a-v1",
    hasActivePolicy: true,
    webhookEnabled: true,
  };

  it("returns safe own-partner wiring booleans", () => {
    const status = buildPartnerIntegrationStatus({
      partnerId: "partner-a",
      keyPrefix: "abx_test_abc123",
      snapshot: baseSnapshot,
    });

    expect(status.partner_id).toBe("partner-a");
    expect(status.key_environment).toBe("sandbox");
    expect(status.key_prefix).toBe("abx_test_abc123");
    expect(status.wiring.return_urls_configured).toBe(true);
    expect(status.wiring.return_url_count).toBe(2);
    expect(status.wiring.active_policy_configured).toBe(true);
    expect(status.wiring.policy_id).toBe("policy-a-v1");
    expect(status.wiring.webhook_enabled).toBe(true);
    expect(status.wiring.partner_flow_ready).toBe(true);
    expect(status.docs.partner_flow_guide).toBe("/docs/partner-flow");
    expect(status.docs.integration_status_endpoint).toBe("/api/partner/integration-status");
  });

  it("labels sandbox keys as not usable for Production access", () => {
    const status = buildPartnerIntegrationStatus({
      partnerId: "partner-a",
      keyPrefix: "abx_test_xyz",
      snapshot: baseSnapshot,
    });

    expect(status.key_environment).toBe("sandbox");
    expect(status.sandbox_notice).toBe(PARTNER_INTEGRATION_SANDBOX_NOTICE);
    expect(status.sandbox_notice.toLowerCase()).toContain("cannot be used for production access");
  });

  it("treats abx_live_ prefix as production key environment", () => {
    const status = buildPartnerIntegrationStatus({
      partnerId: "partner-a",
      keyPrefix: "abx_live_xyz",
      snapshot: baseSnapshot,
    });

    expect(status.key_environment).toBe("production");
  });

  it("does not expose secrets, rules_json, PII, or cross-partner fields", () => {
    const status = buildPartnerIntegrationStatus({
      partnerId: "partner-a",
      keyPrefix: "abx_test_secret",
      snapshot: baseSnapshot,
    });

    const serialized = JSON.stringify(status);
    expect(serialized).not.toContain("rules_json");
    expect(serialized).not.toContain("signing_secret");
    expect(serialized).not.toContain("endpoint_url");
    expect(serialized).not.toContain("partner-b");
    expect(serialized).not.toContain("@");
    expect(serialized).not.toContain("receipt_id");
    expect(serialized).not.toMatch(/abx_test_[A-Za-z0-9_-]{10,}/);
  });

  it("marks partner_flow_ready false when prerequisites are missing", () => {
    const incomplete = buildPartnerIntegrationStatus({
      partnerId: "partner-a",
      keyPrefix: "abx_test_abc",
      snapshot: {
        allowedReturnUrlCount: 0,
        assignedPolicyId: null,
        hasActivePolicy: false,
        webhookEnabled: false,
      },
    });

    expect(incomplete.wiring.return_urls_configured).toBe(false);
    expect(incomplete.wiring.active_policy_configured).toBe(false);
    expect(incomplete.wiring.policy_id).toBeNull();
    expect(incomplete.wiring.webhook_enabled).toBe(false);
    expect(incomplete.wiring.partner_flow_ready).toBe(false);
  });

  it("omits policy_id when no active policy is configured", () => {
    const status = buildPartnerIntegrationStatus({
      partnerId: "partner-a",
      keyPrefix: "abx_test_abc",
      snapshot: {
        ...baseSnapshot,
        hasActivePolicy: false,
        assignedPolicyId: "stale-policy",
      },
    });

    expect(status.wiring.active_policy_configured).toBe(false);
    expect(status.wiring.policy_id).toBeNull();
  });
});
