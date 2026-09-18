import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";

const resolvePartnerConsoleSessionMock = vi.fn();
const getAppMock = vi.fn();
const buildReportMock = vi.fn();
const runStageMock = vi.fn();
const recordRunMock = vi.fn();

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  resolvePartnerConsoleSession: (...args: unknown[]) => resolvePartnerConsoleSessionMock(...args),
  requirePartnerConsoleSession: async (req: NextRequest) => {
    const session = await resolvePartnerConsoleSessionMock(req);
    if (!session) return { ok: false, error: "Partner console sign in required", status: 401 };
    return { ok: true, session };
  },
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => getAppMock(...args),
}));

vi.mock("@/lib/partner/launchpad/sandboxReadiness", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partner/launchpad/sandboxReadiness")>(
    "@/lib/partner/launchpad/sandboxReadiness",
  );
  return {
    ...actual,
    buildSandboxReadinessReport: (...args: unknown[]) => buildReportMock(...args),
    runSandboxReadinessStage: (...args: unknown[]) => runStageMock(...args),
    recordSandboxReadinessRun: (...args: unknown[]) => recordRunMock(...args),
  };
});

function report(overrides: Record<string, unknown> = {}) {
  return {
    evidence: {},
    plan: {
      environment_label: "sandbox/test",
      production_activation_eligible: false,
      overall: "not_run",
      score: { passed: 1, total: 6 },
      next_action: "Run remaining checks.",
      last_run_at: null,
      blockers: [],
      stages: [{
        id: "policy_version_compatibility",
        status: "blocked",
        code: "policy_schema_unavailable",
        detail: "schema missing",
        runnable: false,
        last_run_at: null,
        environment_label: "sandbox/test",
        label: "Policy-version compatibility and explicit adoption",
      }],
      evidence: [],
    },
    manifest: { artifact: "abraxas_partner_sandbox_manifest", sandbox_pass_is_not_production_authorization: true },
    ...overrides,
  };
}

describe("sandbox readiness routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLaunchpadRateLimitStoreForTests();
    resolvePartnerConsoleSessionMock.mockResolvedValue({
      partnerId: "acme",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    getAppMock.mockResolvedValue({
      id: "app-1",
      partner_id: "acme",
      policy_id: "p1",
      policy_version: 1,
    });
    buildReportMock.mockResolvedValue(report());
    recordRunMock.mockResolvedValue(undefined);
  });

  it("GET requires a session", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/launchpad/applications/[id]/sandbox-readiness/route");
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications/app-1/sandbox-readiness"), {
      params: { id: "app-1" },
    });
    expect(res.status).toBe(401);
  });

  it("GET returns server-derived readiness and never activates production", async () => {
    const { GET } = await import("@/app/api/launchpad/applications/[id]/sandbox-readiness/route");
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications/app-1/sandbox-readiness"), {
      params: { id: "app-1" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sandbox_pass_is_not_production_authorization).toBe(true);
    expect(body.issues_production_receipt).toBe(false);
    expect(body.production_activation_eligible).toBe(false);
    expect(body.manifest.sandbox_pass_is_not_production_authorization).toBe(true);
  });

  it("POST rate-limits tenant runs", async () => {
    runStageMock.mockResolvedValue({
      ok: true,
      result: {
        stage: "policy_configured",
        status: "pass",
        code: "policy_configured",
        detail: "ok",
        duplicate: false,
        label: "sandbox/test",
        production_usable: false,
        issues_production_receipt: false,
      },
    });
    const { POST } = await import("@/app/api/launchpad/applications/[id]/sandbox-readiness/route");
    const makeReq = () => new NextRequest("http://localhost/api/launchpad/applications/app-1/sandbox-readiness", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.9" },
      body: JSON.stringify({ stage: "policy_configured" }),
    });
    for (let i = 0; i < 12; i += 1) {
      const res = await POST(makeReq(), { params: { id: "app-1" } });
      expect(res.status).toBe(200);
    }
    const limited = await POST(makeReq(), { params: { id: "app-1" } });
    expect(limited.status).toBe(429);
    const body = await limited.json();
    expect(body.code).toBe("sandbox_rate_limited");
  });

  it("POST records a schema-unavailable policy version stage without activating production", async () => {
    resetLaunchpadRateLimitStoreForTests();
    runStageMock.mockResolvedValue({
      ok: true,
      result: {
        stage: "policy_version_compatibility",
        status: "not_run",
        code: "policy_version_compatible",
        detail: "pending",
        duplicate: false,
        label: "sandbox/test",
        production_usable: false,
        issues_production_receipt: false,
      },
    });
    const { POST } = await import("@/app/api/launchpad/applications/[id]/sandbox-readiness/route");
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/sandbox-readiness", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.10" },
      body: JSON.stringify({ stage: "policy_version_compatibility" }),
    }), { params: { id: "app-1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.run.code).toBe("policy_schema_unavailable");
    expect(body.activates_production).toBe(false);
    expect(recordRunMock).toHaveBeenCalled();
  });
});
