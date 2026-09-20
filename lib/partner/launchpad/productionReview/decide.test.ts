// FILE: lib/partner/launchpad/productionReview/decide.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";

const fromMock = vi.fn();
const recordMock = vi.fn();
const getAppMock = vi.fn();
const loadEvidenceMock = vi.fn();
const probeMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
  SupabaseAdminConfigurationError: class extends Error { code = "supabase_admin_not_configured"; },
}));

vi.mock("@/lib/partner/launchpad/recordActivity", () => ({
  recordLaunchpadActivity: (...args: unknown[]) => recordMock(...args),
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => getAppMock(...args),
}));

vi.mock("@/lib/partner/launchpad/goLiveReadiness/load", () => ({
  loadGoLiveEvidence: (...args: unknown[]) => loadEvidenceMock(...args),
}));

vi.mock("@/lib/policy/changeControl/schemaReady", () => ({
  probePolicyChangeControlSchema: (...args: unknown[]) => probeMock(...args),
}));

import { decideProductionReview } from "./decide";

const application: LaunchpadApplicationRow = {
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
};

const evidence: GoLiveEvidence = {
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
  starterKitRuntime: "nextjs",
  request: { id: "req-1", status: "pending", created_at: "2026-01-02T00:00:00.000Z", reviewed_at: null },
};

function pendingSelect() {
  const eqChain = {
    maybeSingle: async () => ({
      data: {
        id: "req-1",
        application_id: "app-1",
        partner_id: "acme",
        status: "pending",
        request_notes: "Ready",
        created_at: "2026-01-02T00:00:00.000Z",
        reviewed_at: null,
      },
      error: null,
    }),
    limit: async () => ({ error: null }),
    eq: async () => ({ error: null }),
  };
  return {
    select: () => ({
      eq: () => eqChain,
      limit: async () => ({ error: null }),
    }),
    update: () => ({
      eq: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  };
}

describe("decideProductionReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockImplementation(pendingSelect);
    getAppMock.mockResolvedValue(application);
    loadEvidenceMock.mockResolvedValue(evidence);
    probeMock.mockResolvedValue({ ready: true });
    recordMock.mockResolvedValue(undefined);
  });

  it("approves without issuing keys, activating networks, or executing", async () => {
    const result = await decideProductionReview({ requestId: "req-1", decision: "approve", confirm: true });
    expect(result.ok).toBe(true);
    expect(result.decision).toBe("approved");
    expect(result.issues_production_key).toBe(false);
    expect(result.activates_mainnet).toBe(false);
    expect(result.executes).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/abx_live_|generatePartnerKey|rpc/);
    expect(recordMock).toHaveBeenCalled();
    const event = recordMock.mock.calls[0]?.[1] as { eventType: string; metadata: Record<string, unknown> };
    expect(event.eventType).toBe("production_review_approved");
    expect(event.metadata.issues_production_key).toBe(false);
  });

  it("replays an existing approval without overwriting history", async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "req-1", application_id: "app-1", partner_id: "acme", status: "approved", request_notes: null, created_at: "t", reviewed_at: "t2" },
            error: null,
          }),
          limit: async () => ({ error: null }),
        }),
      }),
    }));
    const result = await decideProductionReview({ requestId: "req-1", decision: "approve", confirm: true });
    expect(result).toMatchObject({ ok: true, replay: true, decision: "approved" });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("isolates tenants so the wrong partner app cannot be decided", async () => {
    getAppMock.mockResolvedValue(null);
    const result = await decideProductionReview({ requestId: "req-1", decision: "approve", confirm: true });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("not_found");
  });

  it("rejects without leaking internal blockers to the partner class", async () => {
    const result = await decideProductionReview({
      requestId: "req-1",
      decision: "reject",
      confirm: true,
      remediationClass: "complete_sandbox_readiness",
    });
    expect(result.ok).toBe(true);
    expect(result.decision).toBe("rejected");
    expect(result.remediation_class).toBe("complete_sandbox_readiness");
    expect(JSON.stringify(result)).not.toMatch(/sqlstate|service_role|callback_url/);
  });
});
