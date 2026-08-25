import { describe, expect, it } from "vitest";
import {
  buildWebhookTrackReadiness,
  isCallbackAllowlistConfigured,
  isExplicitSandboxPolicyRules,
  resolveAssignedPolicyReadiness,
  resolvePartnerPortalReadiness,
} from "@/lib/partner/partnerPortalReadiness";

const readyPartner = {
  status: "pilot",
  is_external: true,
  assigned_policy_id: "sandbox-policy-v1",
  allowed_return_urls: ["https://app.example.com/auth/callback"],
};

const sandboxPolicy = {
  id: "sandbox-policy-v1",
  rules_json: { sandbox_only: true },
};

describe("partnerPortalReadiness", () => {
  it("requires explicit sandbox_only in rules_json", () => {
    expect(isExplicitSandboxPolicyRules({ sandbox_only: true })).toBe(true);
    expect(isExplicitSandboxPolicyRules({ sandbox_only: false })).toBe(false);
    expect(isExplicitSandboxPolicyRules({})).toBe(false);
    expect(isExplicitSandboxPolicyRules(null)).toBe(false);
  });

  it("does not infer sandbox from allowed_environments", () => {
    const readiness = resolvePartnerPortalReadiness({
      authPartnerId: "acme-v1",
      keyPrefix: "abx_test_abc",
      scopes: ["verify:credential"],
      partner: {
        ...readyPartner,
        assigned_policy_id: "prod-policy-v1",
      },
      activeAssignedPolicies: [
        { id: "prod-policy-v1", rules_json: { minimum_age: 21 } },
      ],
      webhookPortalStatus: null,
    });

    expect(readiness.active_sandbox_policy_ready).toBe(false);
    expect(readiness.active_policy_id).toBeNull();
  });

  it("fails closed when assigned_policy_id is missing", () => {
    const readiness = resolvePartnerPortalReadiness({
      authPartnerId: "acme-v1",
      keyPrefix: "abx_test_abc",
      scopes: ["verify:credential"],
      partner: { ...readyPartner, assigned_policy_id: null },
      activeAssignedPolicies: [sandboxPolicy],
      webhookPortalStatus: null,
    });

    expect(readiness.assigned_policy_configured).toBe(false);
    expect(readiness.active_policy_id).toBeNull();
    expect(readiness.partner_flow_config_ready).toBe(false);
  });

  it("exposes active_policy_id only when assigned family has one active sandbox version", () => {
    const policyState = resolveAssignedPolicyReadiness({
      authPartnerId: "acme-v1",
      assignedPolicyId: "sandbox-policy-v1",
      activeAssignedPolicies: [sandboxPolicy],
    });

    expect(policyState.active_sandbox_policy_ready).toBe(true);
    expect(policyState.active_policy_id).toBe("sandbox-policy-v1");
    expect(policyState.active_policy_ambiguous).toBe(false);
  });

  it("fails closed when assigned family has zero active versions", () => {
    const policyState = resolveAssignedPolicyReadiness({
      authPartnerId: "acme-v1",
      assignedPolicyId: "sandbox-policy-v1",
      activeAssignedPolicies: [],
    });

    expect(policyState.active_sandbox_policy_ready).toBe(false);
    expect(policyState.active_policy_id).toBeNull();
  });

  it("fails closed when assigned family has multiple active versions", () => {
    const policyState = resolveAssignedPolicyReadiness({
      authPartnerId: "acme-v1",
      assignedPolicyId: "sandbox-policy-v1",
      activeAssignedPolicies: [sandboxPolicy, { ...sandboxPolicy }],
    });

    expect(policyState.active_policy_ambiguous).toBe(true);
    expect(policyState.active_policy_id).toBeNull();
  });

  it("does not use another active policy family as fallback", () => {
    const readiness = resolvePartnerPortalReadiness({
      authPartnerId: "acme-v1",
      keyPrefix: "abx_test_abc",
      scopes: ["verify:credential"],
      partner: {
        ...readyPartner,
        assigned_policy_id: "assigned-policy-v1",
      },
      activeAssignedPolicies: [
        { id: "other-policy-v2", rules_json: { sandbox_only: true } },
      ],
      webhookPortalStatus: null,
    });

    expect(readiness.active_sandbox_policy_ready).toBe(false);
    expect(readiness.active_policy_id).toBeNull();
  });

  it("returns callback_allowlist_configured without exposing stored URLs", () => {
    expect(
      isCallbackAllowlistConfigured(["https://app.example.com/auth/callback"]),
    ).toBe(true);
    expect(isCallbackAllowlistConfigured([])).toBe(false);
    expect(
      isCallbackAllowlistConfigured(["http://evil.example.com/callback"]),
    ).toBe(false);

    const readiness = resolvePartnerPortalReadiness({
      authPartnerId: "acme-v1",
      keyPrefix: "abx_test_abc",
      scopes: ["verify:credential"],
      partner: readyPartner,
      activeAssignedPolicies: [sandboxPolicy],
      webhookPortalStatus: null,
    });

    const serialized = JSON.stringify(readiness);
    expect(serialized).not.toContain("https://app.example.com");
    expect(serialized).not.toContain("rules_json");
    expect(serialized).not.toContain("sandbox_only");
  });

  it("returns inactive webhook track for verify-only keys", () => {
    const track = buildWebhookTrackReadiness({
      scopes: ["verify:credential", "verify:registry"],
      portalStatus: {
        webhook_configured: true,
        webhook_delivery_enabled: true,
        sandbox_test: { available: true },
      },
    });

    expect(track.applicable).toBe(false);
    expect(track.endpoint_configured).toBe(false);
    expect(track.delivery_enabled).toBe(false);
    expect(track.sandbox_test_available).toBe(false);
  });

  it("populates webhook track only when webhooks:read is present", () => {
    const track = buildWebhookTrackReadiness({
      scopes: ["webhooks:read"],
      portalStatus: {
        webhook_configured: true,
        webhook_delivery_enabled: true,
        sandbox_test: { available: true },
      },
    });

    expect(track.applicable).toBe(true);
    expect(track.endpoint_configured).toBe(true);
    expect(track.sandbox_test_available).toBe(true);
  });

  it("does not leak foreign policy identifiers on wrong-owner assignment", () => {
    const readiness = resolvePartnerPortalReadiness({
      authPartnerId: "acme-v1",
      keyPrefix: "abx_test_abc",
      scopes: ["verify:credential"],
      partner: {
        ...readyPartner,
        assigned_policy_id: "foreign-policy-v1",
      },
      activeAssignedPolicies: [],
      webhookPortalStatus: null,
    });

    expect(readiness.active_policy_id).toBeNull();
    const serialized = JSON.stringify(readiness);
    expect(serialized).not.toContain("foreign-policy-v1");
    expect(serialized).not.toContain("mismatch");
  });
});
