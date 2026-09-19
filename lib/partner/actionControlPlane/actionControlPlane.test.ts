// FILE: lib/partner/actionControlPlane/actionControlPlane.test.ts

import { describe, expect, it } from "vitest";
import { ACTION_AUTHORIZATION_CORE_RULES, ACTION_CONTROL_PLANE_PRODUCTION } from "./contract";
import { actionControlPlaneHasForbiddenMaterial, sanitizeActionControlPlaneValue } from "./sanitize";
import { buildActionControlPlaneLifecycle, opaqueActionControlPlaneId } from "./lifecycle";
import { buildActionControlPlaneView, type ActionControlPlaneEvidence } from "./view";
import type { SandboxReadinessEvidence } from "@/lib/partner/launchpad/sandboxReadiness/plan";

function readiness(overrides: Partial<SandboxReadinessEvidence> = {}): SandboxReadinessEvidence {
  return {
    applicationId: "app-a",
    partnerId: "partner-a",
    publicSlug: "acme-sandbox",
    environment: "sandbox",
    status: "active",
    policyId: "pol_age21",
    policyVersion: 3,
    policyTemplateId: "age_21_retail",
    allowedReturnUrls: ["http://localhost:3000/callback"],
    activeSandboxKey: true,
    keyScopes: ["verify:credential"],
    verifiedHostnames: [],
    harnessCompleted: [],
    webhookConfigured: false,
    webhookEnabled: false,
    latestDeliveryStatus: null,
    deliveryFailureBlocker: false,
    schemaSkipCode: null,
    unsupportedEventTypes: [],
    policySchemaReady: true,
    policyChangeControl: { status: "pass", nextAction: "Pinned.", blockerCode: null },
    ...overrides,
  };
}

function evidence(overrides: Partial<ActionControlPlaneEvidence> = {}): ActionControlPlaneEvidence {
  return {
    applicationName: "Acme sandbox",
    readiness: readiness(),
    activity: [],
    productionAccess: { status: "none", request_ref: null },
    activeProductionKey: false,
    ...overrides,
  };
}

describe("Partner Action Control Plane", () => {
  it("keeps tenant application ids isolated in the projected view", () => {
    const view = buildActionControlPlaneView(evidence({
      readiness: readiness({ applicationId: "app-a", partnerId: "partner-a" }),
    }));
    expect(view.application.id).toBe("app-a");
    expect(JSON.stringify(view)).not.toContain("partner-b");
    expect(JSON.stringify(view)).not.toContain("app-b");
  });

  it("uses only safe response keys and strips secrets", () => {
    const dirty = sanitizeActionControlPlaneValue({
      ok: true,
      api_key: "abx_test_secret",
      receipt_id: "dr_leak",
      wallet_address: "So111",
      email: "holder@example.com",
      allowed: true,
    });
    expect(dirty).toEqual({ ok: true, allowed: true });
    const view = buildActionControlPlaneView(evidence());
    expect(actionControlPlaneHasForbiddenMaterial(view)).toBe(false);
    expect(JSON.stringify(view)).not.toMatch(/abx_test_|abx_live_|signature|date_of_birth/);
  });

  it("computes readiness from existing evidence, not client flags", () => {
    const blocked = buildActionControlPlaneView(evidence({
      readiness: readiness({ policyId: "", policyVersion: 0 }),
    }));
    expect(blocked.checklist.find((item) => item.id === "policy_selected")?.status).toBe("blocked");
    expect(blocked.capabilities.find((item) => item.id === "hosted_partner_flow")?.readiness).toBe("blocked");

    const readyFlow = buildActionControlPlaneView(evidence({
      readiness: readiness({
        harnessCompleted: [
          "approved", "denied", "expired", "revoked", "wrong_partner",
          "wrong_policy", "replay", "sandbox_not_production", "pii_absent",
        ],
        webhookConfigured: true,
        latestDeliveryStatus: "delivered",
      }),
    }));
    expect(readyFlow.checklist.find((item) => item.id === "partner_flow_tested")?.status).toBe("ready");
    expect(readyFlow.checklist.find((item) => item.id === "receipt_verification_connected")?.status).toBe("ready");
    expect(readyFlow.checklist.find((item) => item.id === "webhook_endpoint_verified")?.status).toBe("ready");
    expect(readyFlow.capabilities.find((item) => item.id === "trading_venue")?.readiness).toBe("not_run");
    expect(readyFlow.capabilities.find((item) => item.id === "wallet_standard_binding")?.readiness).toBe("optional");
  });

  it("maps lifecycle activity to opaque ids and safe reasons", () => {
    const lifecycle = buildActionControlPlaneLifecycle({
      activity: [
        { id: "evt-raw-uuid", event_type: "proof_reused", public_code: "reused", created_at: "2026-09-19T00:00:00Z" },
        { id: "evt-receipt", event_type: "receipt_issued", public_code: "issued", created_at: "2026-09-19T00:00:01Z" },
        {
          id: "evt-venue",
          event_type: "sandbox_readiness_run",
          public_code: "trading_preflight",
          metadata: { action_family: "trading_venue", probe: true },
          created_at: "2026-09-19T00:00:02Z",
        },
      ],
      webhookFailure: true,
      policyVersionBlocked: true,
    });
    const replay = lifecycle.find((row) => row.lane === "nonce_replay");
    expect(replay?.reason).toBe("nonce_replayed");
    expect(replay?.last_opaque_id).toBe(opaqueActionControlPlaneId("evt-raw-uuid"));
    expect(replay?.last_opaque_id).not.toContain("evt-raw-uuid");
    expect(lifecycle.find((row) => row.lane === "webhook_delivery")?.reason).toBe("webhook_failed");
    expect(lifecycle.find((row) => row.lane === "policy_version")?.reason).toBe("policy_version_blocked");
    expect(lifecycle.find((row) => row.lane === "action_preflight")?.count).toBeGreaterThan(0);
  });

  it("denies self-issued Production upgrade on the control plane contract", () => {
    const view = buildActionControlPlaneView(evidence());
    expect(view.production_upgrade.self_issued).toBe(false);
    expect(view.production_upgrade.reviewed).toBe(true);
    expect(view.production_upgrade.deny_code).toBe("production_upgrade_requires_review");
    expect(view.checklist.find((item) => item.id === "production_upgrade_readiness")?.reason).toBe("review_required");
    expect(view.action_authorization_rules).toEqual([...ACTION_AUTHORIZATION_CORE_RULES]);
    expect(ACTION_CONTROL_PLANE_PRODUCTION.self_issued).toBe(false);
  });

  it("marks Production ready only after reviewed activation", () => {
    const view = buildActionControlPlaneView(evidence({
      readiness: readiness({ environment: "production" }),
      productionAccess: { status: "approved", request_ref: "req_opaque" },
      activeProductionKey: true,
    }));
    expect(view.checklist.find((item) => item.id === "production_upgrade_readiness")?.reason).toBe("reviewed_active");
  });
});
