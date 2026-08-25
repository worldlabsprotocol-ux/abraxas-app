// FILE: lib/partner/partnerPortalCapabilities.test.ts

import { describe, expect, it } from "vitest";
import type { PortalReadinessSnapshot } from "@/lib/partner/partnerPortalCapabilities";
import {
  computeCapabilityAwarePortalOnboarding,
  resolvePortalCapabilities,
  shouldShowMainnetGate,
} from "@/lib/partner/partnerPortalCapabilities";

const baseReadiness: PortalReadinessSnapshot = {
  partner_row_ready: true,
  assigned_policy_configured: true,
  active_sandbox_policy_ready: true,
  callback_allowlist_configured: true,
  partner_flow_config_ready: true,
  key_environment: "sandbox",
  webhook_track: {
    endpoint_configured: false,
    delivery_enabled: false,
    sandbox_test_available: false,
  },
};

function readinessWithWebhookTrack(
  overrides: Partial<PortalReadinessSnapshot["webhook_track"]> = {},
): PortalReadinessSnapshot {
  return {
    ...baseReadiness,
    webhook_track: {
      endpoint_configured: false,
      delivery_enabled: false,
      sandbox_test_available: false,
      ...overrides,
    },
  };
}

describe("partnerPortalCapabilities", () => {
  it("resolves verify and webhook capabilities from scopes", () => {
    expect(resolvePortalCapabilities(["verify:credential"])).toEqual({
      verifyCapable: true,
      webhookCapable: false,
      hasPortalIntegration: true,
    });
    expect(resolvePortalCapabilities(["webhooks:read"])).toEqual({
      verifyCapable: false,
      webhookCapable: true,
      hasPortalIntegration: true,
    });
    expect(resolvePortalCapabilities(["verify:registry", "webhooks:read"])).toEqual({
      verifyCapable: true,
      webhookCapable: true,
      hasPortalIntegration: true,
    });
    expect(resolvePortalCapabilities([])).toEqual({
      verifyCapable: false,
      webhookCapable: false,
      hasPortalIntegration: false,
    });
  });

  it("counts unsupported-scope onboarding as 1/1 authenticated only", () => {
    const progress = computeCapabilityAwarePortalOnboarding({
      scopes: [],
      readiness: baseReadiness,
    });

    expect(progress.total).toBe(1);
    expect(progress.completed).toBe(1);
    expect(progress.steps.map((step) => step.id)).toEqual(["key_authenticated"]);
  });

  it("counts verify-only onboarding up to 6 automatic steps", () => {
    const progress = computeCapabilityAwarePortalOnboarding({
      scopes: ["verify:credential", "verify:registry"],
      readiness: baseReadiness,
    });

    expect(progress.total).toBe(6);
    expect(progress.completed).toBe(6);
    expect(progress.steps.some((step) => step.id.startsWith("webhook_"))).toBe(false);
  });

  it("counts verify-only partial provisioning without manual milestones", () => {
    const progress = computeCapabilityAwarePortalOnboarding({
      scopes: ["verify:credential"],
      readiness: {
        ...baseReadiness,
        partner_row_ready: true,
        assigned_policy_configured: false,
        active_sandbox_policy_ready: false,
        callback_allowlist_configured: false,
        partner_flow_config_ready: false,
      },
    });

    expect(progress.total).toBe(6);
    expect(progress.completed).toBe(2);
  });

  it("counts webhook-only onboarding up to 4 automatic steps", () => {
    const progress = computeCapabilityAwarePortalOnboarding({
      scopes: ["webhooks:read"],
      readiness: readinessWithWebhookTrack({
        endpoint_configured: true,
        delivery_enabled: true,
        sandbox_test_available: true,
      }),
    });

    expect(progress.total).toBe(4);
    expect(progress.completed).toBe(4);
    expect(progress.steps.map((step) => step.id)).toEqual([
      "key_authenticated",
      "webhook_endpoint_configured",
      "webhook_delivery_enabled",
      "webhook_sandbox_test_available",
    ]);
  });

  it("counts webhook-only partial ops readiness as 2/4", () => {
    const progress = computeCapabilityAwarePortalOnboarding({
      scopes: ["webhooks:read"],
      readiness: readinessWithWebhookTrack({
        endpoint_configured: true,
      }),
    });

    expect(progress.total).toBe(4);
    expect(progress.completed).toBe(2);
  });

  it("counts combined onboarding up to 9 automatic steps", () => {
    const progress = computeCapabilityAwarePortalOnboarding({
      scopes: ["verify:credential", "webhooks:read"],
      readiness: {
        ...baseReadiness,
        webhook_track: {
          endpoint_configured: true,
          delivery_enabled: true,
          sandbox_test_available: true,
        },
      },
    });

    expect(progress.total).toBe(9);
    expect(progress.completed).toBe(9);
  });

  it("counts combined partial progress as 6/9 when Partner Flow is ready and webhook ops are not", () => {
    const progress = computeCapabilityAwarePortalOnboarding({
      scopes: ["verify:credential", "webhooks:read"],
      readiness: {
        ...baseReadiness,
        webhook_track: {
          endpoint_configured: false,
          delivery_enabled: false,
          sandbox_test_available: false,
        },
      },
    });

    expect(progress.total).toBe(9);
    expect(progress.completed).toBe(6);
  });

  it("does not treat webhooks:read as its own milestone", () => {
    const progress = computeCapabilityAwarePortalOnboarding({
      scopes: ["webhooks:read"],
      readiness: readinessWithWebhookTrack(),
    });

    expect(progress.steps.some((step) => step.id.includes("scope"))).toBe(false);
  });

  it("shows mainnet gate only for production keys with verify capability", () => {
    expect(shouldShowMainnetGate({
      scopes: ["verify:credential"],
      keyEnvironment: "production",
    })).toBe(true);
    expect(shouldShowMainnetGate({
      scopes: ["verify:credential"],
      keyEnvironment: "sandbox",
    })).toBe(false);
    expect(shouldShowMainnetGate({
      scopes: ["webhooks:read"],
      keyEnvironment: "production",
    })).toBe(false);
    expect(shouldShowMainnetGate({
      scopes: [],
      keyEnvironment: "production",
    })).toBe(false);
  });
});
