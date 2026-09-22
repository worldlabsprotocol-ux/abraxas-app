// FILE: lib/partner/launchpad/productionReview/productionReview.test.ts

import { describe, expect, it } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";
import { evaluateProductionReviewGates } from "./evaluate";
import { productionReviewClientOverride } from "./csrf";
import { productionReviewLeaks, toProductionReviewQueueItem } from "./snapshot";
import { opaqueProductionRequestRef } from "./opaque";
import { partnerRemediationForBlocker } from "./contract";

function app(overrides: Partial<LaunchpadApplicationRow> = {}): LaunchpadApplicationRow {
  return {
    id: "app-1",
    public_slug: "acme-app",
    partner_id: "acme",
    application_name: "Acme sandbox",
    display_name: "Acme",
    environment: "sandbox",
    policy_id: "acme-age_21_retail-v1",
    policy_version: 1,
    policy_template_id: "age_21_retail",
    allowed_return_urls: ["https://partner.example/callback"],
    api_key_id: "key-1",
    production_api_key_id: null,
    production_key_revealed_at: null,
    status: "active",
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function evidence(overrides: Partial<GoLiveEvidence> = {}): GoLiveEvidence {
  return {
    applicationId: "app-1",
    partnerId: "acme",
    status: "active",
    environment: "sandbox",
    policyId: "acme-age_21_retail-v1",
    policyVersion: 1,
    policyTemplateId: "age_21_retail",
    allowedReturnUrls: ["https://partner.example/callback"],
    activeSandboxKey: true,
    webhookConfigured: true,
    webhookEnabled: true,
    latestDeliveryStatus: "delivered",
    verifiedHostnames: ["partner.example"],
    starterKitEvidenced: true,
    starterKitRuntime: "typescript_nextjs",
    request: { id: "req-1", status: "pending", created_at: "2026-01-02T00:00:00.000Z", reviewed_at: null },
    ...overrides,
  };
}

describe("production review control plane", () => {
  it("re-checks server readiness and fails closed when sandbox evidence is incomplete", () => {
    const gates = evaluateProductionReviewGates({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "pending" },
      application: app(),
      evidence: evidence({ activeSandboxKey: false, allowedReturnUrls: [], verifiedHostnames: [] }),
      durableSchemaReady: true,
    });
    expect(gates.ok).toBe(false);
    expect(gates.blockers).toContain("readiness_incomplete");
  });

  it("allows a pending request that passes server readiness re-check", () => {
    const gates = evaluateProductionReviewGates({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "pending" },
      application: app(),
      evidence: evidence(),
      durableSchemaReady: true,
    });
    expect(gates.ok).toBe(true);
    expect(gates.issues_production_key).toBe(false);
    expect(gates.activates_mainnet).toBe(false);
    expect(gates.executes).toBe(false);
  });

  it("enforces pending-only decisions", () => {
    const gates = evaluateProductionReviewGates({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "approved" },
      application: app(),
      evidence: evidence(),
      durableSchemaReady: true,
    });
    expect(gates.blockers).toContain("request_not_pending");
    expect(partnerRemediationForBlocker("request_not_pending")).toBe("resubmit_after_rejection");
  });

  it("denies missing durable schema and unresolved revocation", () => {
    expect(evaluateProductionReviewGates({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "pending" },
      application: app(),
      evidence: evidence(),
      durableSchemaReady: false,
    }).blockers).toContain("durable_schema_missing");
    expect(evaluateProductionReviewGates({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "pending" },
      application: app({ status: "suspended" }),
      evidence: evidence({ status: "suspended" }),
      durableSchemaReady: true,
    }).blockers).toContain("revocation_unresolved");
  });

  it("denies policy/version mismatch and sandbox-only packs", () => {
    expect(evaluateProductionReviewGates({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "pending" },
      application: app({ policy_version: 9 }),
      evidence: evidence(),
      durableSchemaReady: true,
    }).blockers).toContain("policy_version_mismatch");
    expect(evaluateProductionReviewGates({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "pending" },
      application: app({ policy_template_id: "sandbox_economic_demo" }),
      evidence: evidence({ policyTemplateId: "sandbox_economic_demo" }),
      durableSchemaReady: true,
    }).blockers).toContain("sandbox_only_policy");
    expect(evaluateProductionReviewGates({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "pending" },
      application: app({
        policy_template_id: "sandbox_institutional_protocol_access",
        policy_id: "sandbox_institutional_protocol_access",
      }),
      evidence: evidence({
        policyTemplateId: "sandbox_institutional_protocol_access",
        policyId: "sandbox_institutional_protocol_access",
      }),
      durableSchemaReady: true,
    }).blockers).toContain("sandbox_only_policy");
  });

  it("denies disabled, planned, and unconfigured Mainnet networks", () => {
    expect(evaluateProductionReviewGates({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "pending" },
      application: app(),
      evidence: evidence(),
      durableSchemaReady: true,
      requestedNetworkIds: ["arc_circle_mainnet"],
    }).blockers).toContain("network_disabled");
    expect(evaluateProductionReviewGates({
      request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "pending" },
      application: app(),
      evidence: evidence(),
      durableSchemaReady: true,
      requestedNetworkIds: ["solana_mainnet"],
    }).ok).toBe(true);
  });

  it("rejects client override fields and never serializes secrets", () => {
    expect(productionReviewClientOverride({ decision: "approve", confirm: true })).toBe(false);
    expect(productionReviewClientOverride({ decision: "approve", confirm: true, api_key: "abx_live_secret" })).toBe(true);
    expect(productionReviewClientOverride({ decision: "approve", role: "admin" })).toBe(true);
    const item = toProductionReviewQueueItem({
      requestId: "req-1",
      status: "pending",
      createdAt: "2026-01-02T00:00:00.000Z",
      note: "Ready for review",
      application: app(),
      evidence: evidence(),
      gates: evaluateProductionReviewGates({
        request: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "pending" },
        application: app(),
        evidence: evidence(),
        durableSchemaReady: true,
      }),
    });
    expect(item.request_ref).toBe(opaqueProductionRequestRef("req-1"));
    expect(productionReviewLeaks(item)).toEqual([]);
    expect(JSON.stringify(item)).not.toMatch(/allowed_return_urls|abx_live_|wallet_address|receipt_id/);
  });

  it("maps partner-visible remediation without internal reasons", () => {
    expect(partnerRemediationForBlocker("network_disabled")).toBe("remove_unavailable_network");
    expect(partnerRemediationForBlocker("store_unavailable")).toBe("wait_for_reviewer");
  });
});
