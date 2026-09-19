// FILE: lib/partner/launchpad/launchpadApiRoutes.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const resolvePartnerConsoleSessionMock = vi.fn();
const requireSupabaseAdminMock = vi.fn();
const buildWorkspaceMock = vi.fn();
const pccAvailabilityMock = vi.fn();

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  resolvePartnerConsoleSession: (...args: unknown[]) => resolvePartnerConsoleSessionMock(...args),
  requirePartnerConsoleSession: async (req: NextRequest) => {
    const session = await resolvePartnerConsoleSessionMock(req);
    if (!session) return { ok: false, error: "Partner console sign in required", status: 401 };
    return { ok: true, session };
  },
}));

vi.mock("@/lib/partner/launchpad/workspaceView", () => ({
  buildLaunchpadWorkspaceView: (...args: unknown[]) => buildWorkspaceMock(...args),
}));

vi.mock("@/lib/partner/launchpad/policyChangeControlAvailability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partner/launchpad/policyChangeControlAvailability")>(
    "@/lib/partner/launchpad/policyChangeControlAvailability",
  );
  return {
    ...actual,
    resolvePolicyChangeControlUiAvailability: (...args: unknown[]) => pccAvailabilityMock(...args),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => requireSupabaseAdminMock(),
  getSupabaseAdmin: () => null,
}));

describe("launchpad API authorization boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    buildWorkspaceMock.mockResolvedValue({ partner_id: "acme", applications: [] });
    pccAvailabilityMock.mockResolvedValue(false);
  });

  it("GET /api/launchpad/applications returns 401 without session", async () => {
    const { GET } = await import("@/app/api/launchpad/applications/route");
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications"));
    expect(res.status).toBe(401);
  });

  it("GET /api/launchpad/applications returns workspace for authenticated partner", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue({
      partnerId: "acme",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    const { GET } = await import("@/app/api/launchpad/applications/route");
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications", {
      headers: { cookie: "abraxas_partner_console_session=test" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(buildWorkspaceMock).toHaveBeenCalledWith("acme");
  });

  it("includes policy_change_control_available=false for Production-style missing schema", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue({
      partnerId: "acme",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    pccAvailabilityMock.mockResolvedValue(false);
    const { GET } = await import("@/app/api/launchpad/applications/route");
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications", {
      headers: { cookie: "abraxas_partner_console_session=test" },
    }));
    const body = await res.json();
    expect(body.workspace.policy_change_control_available).toBe(false);
  });

  it("POST /api/launchpad/applications denies production self-service", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue({
      partnerId: "acme",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    const { POST } = await import("@/app/api/launchpad/applications/route");
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "abraxas_partner_console_session=test" },
      body: JSON.stringify({
        application_name: "Live",
        partner_id: "acme",
        policy_template_id: "age_21_retail",
        return_url: "https://shop.example.com/callback",
        environment: "production",
      }),
    }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("production_denied");
  });

  it("includes policy_change_control_available=true for DEMO-style present schema", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue({
      partnerId: "acme",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    pccAvailabilityMock.mockResolvedValue(true);
    const { GET } = await import("@/app/api/launchpad/applications/route");
    const res = await GET(new NextRequest("http://localhost/api/launchpad/applications", {
      headers: { cookie: "abraxas_partner_console_session=test" },
    }));
    const body = await res.json();
    expect(body.workspace.policy_change_control_available).toBe(true);
  });
});
