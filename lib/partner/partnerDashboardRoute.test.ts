// FILE: lib/partner/partnerDashboardRoute.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authenticatePartnerMock = vi.fn();
const getDashboardMock = vi.fn();

vi.mock("@/lib/partner/partnerAuth", () => ({
  authenticatePartner: (...args: unknown[]) => authenticatePartnerMock(...args),
}));

vi.mock("@/lib/partner/partnerDashboard", () => ({
  getPartnerDashboard: (...args: unknown[]) => getDashboardMock(...args),
}));

import { GET } from "@/app/api/partner/dashboard/route";

const authCtx = {
  partnerId: "partner-a",
  apiKeyId: "key-1",
  displayName: "Partner A",
  keyPrefix: "abx_test_abc",
  scopes: ["verify:credential", "verify:registry"],
};

const baseReadiness = {
  partner_row_ready: true,
  assigned_policy_configured: true,
  active_sandbox_policy_ready: true,
  active_policy_id: "sandbox-policy-v1",
  active_policy_ambiguous: false,
  callback_allowlist_configured: true,
  partner_flow_config_ready: true,
  verify_scopes_available: true,
  key_environment: "sandbox" as const,
  webhook_track: {
    applicable: false,
    scope_ready: false,
    endpoint_configured: false,
    delivery_enabled: false,
    sandbox_test_available: false,
  },
  sandbox_notice: "Sandbox configuration cannot authorize Production access.",
};

const baseDashboard = {
  partner_id: "partner-a",
  display_name: "Partner A",
  company: "Partner A Co",
  status: "pilot",
  key_prefix: "abx_test_abc",
  scopes: ["verify:credential", "verify:registry"],
  stats: {
    calls_30d: 0,
    success_30d: 0,
    success_rate: null,
    calls_7d: 0,
  },
  recent_events: [],
  readiness: baseReadiness,
  onboarding: {
    steps: [],
    completed: 4,
    total: 8,
  },
  mainnet_gate: {
    eligible: false,
    criteria: "Unaffiliated abx_live_ partner with decision: approved on a production verify call.",
  },
};

describe("GET /api/partner/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDashboardMock.mockResolvedValue(baseDashboard);
  });

  it("returns 401 when no API key is provided", async () => {
    authenticatePartnerMock.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost/api/partner/dashboard"));
    expect(res.status).toBe(401);
    expect(getDashboardMock).not.toHaveBeenCalled();
  });

  it("uses authenticated partner identity only and ignores client partner_id", async () => {
    authenticatePartnerMock.mockResolvedValue({ ok: true, ctx: authCtx });

    await GET(
      new NextRequest("http://localhost/api/partner/dashboard?partner_id=partner-b"),
    );

    expect(getDashboardMock).toHaveBeenCalledWith(
      "partner-a",
      "abx_test_abc",
      "Partner A",
      ["verify:credential", "verify:registry"],
    );
  });

  it("returns readiness without secrets, URLs, or rules_json", async () => {
    authenticatePartnerMock.mockResolvedValue({ ok: true, ctx: authCtx });

    const res = await GET(new NextRequest("http://localhost/api/partner/dashboard"));
    const body = await res.json() as { ok: boolean; dashboard: typeof baseDashboard };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.dashboard.readiness.active_policy_id).toBe("sandbox-policy-v1");

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("endpoint_url");
    expect(serialized).not.toContain("allowed_return_urls");
    expect(serialized).not.toContain("https://app.example.com");
    expect(serialized).not.toContain("rules_json");
    expect(serialized).not.toContain("sandbox_only");
    expect(serialized).not.toContain("whsec");
    expect(serialized).not.toContain("SQLSTATE");
    expect(serialized).not.toContain("manual_steps_required");
  });

  it("returns verify-only webhook track as not applicable", async () => {
    authenticatePartnerMock.mockResolvedValue({ ok: true, ctx: authCtx });

    const res = await GET(new NextRequest("http://localhost/api/partner/dashboard"));
    const body = await res.json() as { dashboard: typeof baseDashboard };

    expect(body.dashboard.readiness.webhook_track.applicable).toBe(false);
    expect(body.dashboard.readiness.webhook_track.endpoint_configured).toBe(false);
  });
});
