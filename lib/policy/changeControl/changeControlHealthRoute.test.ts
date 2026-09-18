import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { REQUIRED_HARNESS_SCENARIOS } from "@/lib/partner/launchpad/partnerTestHarness";

const sessionMock = vi.fn();
const appMock = vi.fn();
const probeMock = vi.fn();
const overviewMock = vi.fn();
const webhookMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/partner/launchpad/apiHelpers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partner/launchpad/apiHelpers")>(
    "@/lib/partner/launchpad/apiHelpers",
  );
  return {
    ...actual,
    requireLaunchpadSession: (...args: unknown[]) => sessionMock(...args),
  };
});

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => appMock(...args),
}));

vi.mock("@/lib/policy/changeControl/schemaReady", async () => {
  const actual = await vi.importActual<typeof import("@/lib/policy/changeControl/schemaReady")>(
    "@/lib/policy/changeControl/schemaReady",
  );
  return {
    ...actual,
    probePolicyChangeControlSchema: (...args: unknown[]) => probeMock(...args),
  };
});

vi.mock("@/lib/policy/changeControl/overview", () => ({
  buildPolicyChangeControlOverview: (...args: unknown[]) => overviewMock(...args),
}));

vi.mock("@/lib/partner/eventDelivery/launchpadWebhook", () => ({
  getLaunchpadWebhookOverview: (...args: unknown[]) => webhookMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
}));

vi.mock("@/lib/partner/launchpad/partnerTestHarness", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partner/launchpad/partnerTestHarness")>(
    "@/lib/partner/launchpad/partnerTestHarness",
  );
  return {
    ...actual,
    harnessPassedFromActivity: () => ({
      passed: true,
      completed: actual.REQUIRED_HARNESS_SCENARIOS,
      missing: [],
    }),
  };
});

import { GET } from "@/app/api/launchpad/applications/[id]/health/route";

function thenable(data: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "limit"]) {
    chain[method] = () => chain;
  }
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve({ data, error: null }).then(resolve, reject);
  return chain;
}

describe("launchpad health policy schema availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.mockResolvedValue({ ok: true, session: { partnerId: "partner-a" } });
    appMock.mockResolvedValue({
      id: "app-1",
      public_slug: "partner-app",
      partner_id: "partner-a",
      application_name: "App",
      display_name: "App",
      environment: "production",
      policy_id: "policy-v1",
      policy_version: 1,
      policy_template_id: "age_21_retail",
      allowed_return_urls: ["https://partner.example.com/callback"],
      api_key_id: "sandbox-key",
      production_api_key_id: "live-key",
      production_key_revealed_at: "2026-01-01T00:00:00.000Z",
      status: "active",
      idempotency_key: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "partner_api_keys") {
        return thenable([
          { id: "sandbox-key", revoked_at: null },
          { id: "live-key", revoked_at: null },
        ]);
      }
      if (table === "partner_launchpad_domain_verifications") {
        return thenable([{ hostname: "partner.example.com" }]);
      }
      return thenable([]);
    });
    webhookMock.mockResolvedValue({
      webhook_configured: true,
      webhook_enabled: true,
      signing_secret_available: true,
      latest_delivery_status: "delivered",
      delivery_failure_blocker: false,
      extended_event_types_available: true,
      unsupported_lifecycle_events: [],
      schema_skip_code: null,
      production_compatibility: "receipt.issued, receipt.revoked, and TEST EVENT",
    });
  });

  it("reports blocked with policy_schema_unavailable instead of pass when schema is missing", async () => {
    probeMock.mockResolvedValue({
      ready: false,
      lifecycle_audit: false,
      adoptions: false,
      deprecate_effective_at: false,
    });
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications/app-1/health"), {
      params: { id: "app-1" },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.overall).toBe("blocked");
    expect(body.overall).not.toBe("pass");
    const check = body.checks.find((item: { id: string }) => item.id === "policy_change_control");
    expect(check.status).toBe("blocked");
    expect(check.detail).toContain("policy_schema_unavailable");
    expect(overviewMock).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toMatch(/42P01|PGRST|does not exist/);
    expect(REQUIRED_HARNESS_SCENARIOS.length).toBeGreaterThan(0);
  });

  it("stays blocked when overview errors are swallowed after a ready probe", async () => {
    probeMock.mockResolvedValue({
      ready: true,
      lifecycle_audit: true,
      adoptions: true,
      deprecate_effective_at: true,
    });
    overviewMock.mockRejectedValue(new Error('relation "partner_policy_lifecycle_audit" does not exist'));
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications/app-1/health"), {
      params: { id: "app-1" },
    });
    const body = await res.json();
    expect(body.overall).toBe("blocked");
    expect(body.overall).not.toBe("pass");
    const check = body.checks.find((item: { id: string }) => item.id === "policy_change_control");
    expect(check.status).toBe("blocked");
    expect(check.detail).toContain("policy_schema_unavailable");
    expect(JSON.stringify(body)).not.toContain("partner_policy_lifecycle_audit");
    expect(JSON.stringify(body)).not.toMatch(/42P01|does not exist/);
  });
});
