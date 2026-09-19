import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";
import { sandboxTestFixtureLeaks } from "./fixtures";

const resolvePartnerConsoleSessionMock = vi.fn();
const getAppMock = vi.fn();
const evidenceMock = vi.fn();

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

vi.mock("@/lib/partner/launchpad/sandboxReadiness", () => ({
  collectSandboxReadinessEvidence: (...args: unknown[]) => evidenceMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({}),
  getSupabaseAdmin: () => null,
}));

const app = {
  id: "app-1",
  partner_id: "acme",
  status: "active",
  environment: "sandbox",
  policy_id: "acme-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["http://localhost:3000/callback"],
  api_key_id: "key-1",
};

function get(url: string, cookie = true) {
  return new NextRequest(url, {
    headers: cookie ? { cookie: "abraxas_partner_console_session=test" } : {},
  });
}

describe("sandbox test console route", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    vi.clearAllMocks();
    resolvePartnerConsoleSessionMock.mockResolvedValue({
      partnerId: "acme",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    getAppMock.mockResolvedValue(app);
    evidenceMock.mockResolvedValue({ webhookConfigured: false });
  });

  it("rejects unsigned reads", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/launchpad/applications/[id]/sandbox-test-console/route");
    const res = await GET(get("http://localhost/api/launchpad/applications/app-1/sandbox-test-console", false), {
      params: { id: "app-1" },
    });
    expect(res.status).toBe(401);
    expect(getAppMock).not.toHaveBeenCalled();
  });

  it("looks up the app by application_id plus session partner_id", async () => {
    getAppMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/launchpad/applications/[id]/sandbox-test-console/route");
    const res = await GET(get("http://localhost/api/launchpad/applications/app-b/sandbox-test-console"), {
      params: { id: "app-b" },
    });
    expect(res.status).toBe(404);
    expect(getAppMock).toHaveBeenCalledWith("app-b", "acme");
  });

  it("returns leak-free fixtures and denies production actions", async () => {
    const { GET, POST } = await import("@/app/api/launchpad/applications/[id]/sandbox-test-console/route");
    const res = await GET(get("http://localhost/api/launchpad/applications/app-1/sandbox-test-console?capability=webhooks"), {
      params: { id: "app-1" },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.issues_production_key).toBe(false);
    expect(json.grants_production).toBe(false);
    expect(json.application_id).toBe("app-1");
    expect(sandboxTestFixtureLeaks(json)).toEqual([]);
    expect(JSON.stringify(json)).not.toContain("acme-age_21_retail-v1");
    expect(JSON.stringify(json)).not.toContain("abx_test_");

    const denied = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/sandbox-test-console", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "abraxas_partner_console_session=test" },
      body: JSON.stringify({ activate_production: true, partner_id: "other" }),
    }), { params: { id: "app-1" } });
    expect(denied.status).toBe(403);
    expect((await denied.json() as { error: string }).error).toBe("production_denied");
  });
});
