import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";
import { resetHostedHandoffsForTests } from "@/lib/partner/hostedHandoff";

vi.mock("@/lib/partner/launchpad/rateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/launchpad/rateLimit")>();
  return {
    ...actual,
    checkLaunchpadRateLimit: vi.fn(async () => ({ allowed: true as const })),
    checkLaunchpadTenantRateLimit: vi.fn(async () => ({ allowed: true as const })),
  };
});

const resolvePartnerConsoleSessionMock = vi.fn();
const getAppMock = vi.fn();
const loadStoredMock = vi.fn();
const authenticatePartnerScopedMock = vi.fn();
const getAppByIdMock = vi.fn();

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
  getLaunchpadApplicationById: (...args: unknown[]) => getAppByIdMock(...args),
}));

vi.mock("@/lib/partner/launchpad/partnerFlowRequest", () => ({
  loadPartnerFlowStoredConfig: (...args: unknown[]) => loadStoredMock(...args),
}));

vi.mock("@/lib/partner/partnerAuth", () => ({
  authenticatePartnerScoped: (...args: unknown[]) => authenticatePartnerScopedMock(...args),
  authenticatePartner: (...args: unknown[]) => authenticatePartnerScopedMock(...args),
}));

import { POST } from "@/app/api/launchpad/applications/[id]/hosted-handoff/route";
import { POST as fixturePost } from "@/app/api/launchpad/applications/[id]/hosted-handoff/fixture/route";
import { POST as runtimePost } from "@/app/api/v1/partner-handoff/route";
import { GET as runtimeGet } from "@/app/api/v1/partner-handoff/[ref]/route";

const app = {
  id: "11111111-1111-1111-1111-111111111111",
  public_slug: "acme-retail",
  partner_id: "acme",
  application_name: "Acme retail",
  display_name: "Acme",
  environment: "sandbox",
  policy_id: "acme-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["http://localhost:3000/callback"],
  status: "active",
};

describe("hosted-handoff launchpad routes", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    resetHostedHandoffsForTests();
    vi.clearAllMocks();
    resolvePartnerConsoleSessionMock.mockResolvedValue({ partnerId: "acme" });
    authenticatePartnerScopedMock.mockResolvedValue({ ok: true, ctx: { partnerId: "acme", keyPrefix: "abx_test_abc12345" } });
    getAppByIdMock.mockResolvedValue(app);
    getAppMock.mockResolvedValue(app);
    loadStoredMock.mockResolvedValue({
      purpose: "Confirm adult retail eligibility",
      action: "retail_access",
      callback_url: "http://localhost:3000/callback",
      capabilities: [],
      display_label: "Acme",
    });
  });

  it("rejects unsigned access and client override fields", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    const denied = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/hosted-handoff", {
      method: "POST",
      body: "{}",
    }), { params: { id: app.id } });
    expect(denied.status).toBe(401);

    resolvePartnerConsoleSessionMock.mockResolvedValue({ partnerId: "acme" });
    const forged = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/hosted-handoff", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "abraxas_partner_console_session=test" },
      body: JSON.stringify({ runtime: "nextjs", return_url: "https://evil.example" }),
    }), { params: { id: app.id } });
    expect(forged.status).toBe(400);
  });

  it("creates a handoff for canonical Good Trouble sandbox shape (primary binding fallback)", async () => {
    getAppMock.mockResolvedValue({
      ...app,
      id: "690d0c89-7b98-4946-8ad2-7469f5ca89d9",
      public_slug: "good-trouble",
      partner_id: "good-trouble",
      policy_id: "good-trouble-age_21_retail-v1",
      policy_version: 2,
      policy_template_id: "age_21_retail",
      allowed_return_urls: ["https://www.goodtroublecanna.com/age-verification-result"],
    });
    loadStoredMock.mockResolvedValue({
      purpose: "Confirm adult retail eligibility",
      action: "retail_access",
      callback_url: "https://www.goodtroublecanna.com/age-verification-result",
      capabilities: [],
      display_label: "Good Trouble",
    });
    const created = await POST(new NextRequest("http://localhost/api/launchpad/applications/690d0c89/hosted-handoff", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "abraxas_partner_console_session=test" },
      body: JSON.stringify({ runtime: "universal_https" }),
    }), { params: { id: "690d0c89-7b98-4946-8ad2-7469f5ca89d9" } });
    expect(created.status).toBe(200);
    const json = await created.json() as { hosted_url: string; policy_version?: number; handoff_ref: string };
    expect(json.hosted_url).toContain("verify_request=");
    expect(json.handoff_ref).toMatch(/^hpf_[0-9a-f]{16}$/);
  });

  it("creates a public hosted URL and runs the sandbox fixture", async () => {
    const created = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/hosted-handoff", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "abraxas_partner_console_session=test" },
      body: JSON.stringify({ runtime: "universal_https" }),
    }), { params: { id: app.id } });
    expect(created.status).toBe(200);
    const json = await created.json() as { hosted_url: string; activates_production: boolean };
    expect(json.hosted_url).toContain("verify_request=");
    expect(json.activates_production).toBe(false);

    const fixture = await fixturePost(new NextRequest("http://localhost/api/launchpad/applications/app-1/hosted-handoff/fixture", {
      method: "POST",
      headers: { cookie: "abraxas_partner_console_session=test" },
    }), { params: { id: app.id } });
    expect(fixture.status).toBe(200);
    const body = await fixture.json() as { partner_must_call: string };
    expect(body.partner_must_call).toBe("AbraxasPartnerKit.verifyReceiptId");
  });

  it("requires partner API credentials for runtime create", async () => {
    authenticatePartnerScopedMock.mockResolvedValue({ ok: false, status: 401, error: "unauthorized" });
    const denied = await runtimePost(new NextRequest("http://localhost/api/v1/partner-handoff", {
      method: "POST",
      headers: { "x-abraxas-application-id": app.id },
      body: JSON.stringify({ runtime: "universal_https" }),
    }));
    expect(denied.status).toBe(401);

    authenticatePartnerScopedMock.mockResolvedValue({ ok: true, ctx: { partnerId: "acme", keyPrefix: "abx_test_abc12345" } });
    const created = await runtimePost(new NextRequest("http://localhost/api/v1/partner-handoff", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-abraxas-application-id": app.id,
      },
      body: JSON.stringify({ runtime: "universal_https" }),
    }));
    expect(created.status).toBe(200);
    const json = await created.json() as { hosted_url: string; handoff_ref: string; public_receipt_id: string | null };
    expect(json.hosted_url).toContain("verify_request=");
    expect(json.public_receipt_id).toBeNull();

    const lookup = await runtimeGet(new NextRequest(`http://localhost/api/v1/partner-handoff/${json.handoff_ref}`), {
      params: { ref: json.handoff_ref },
    });
    expect(lookup.status).toBe(200);
    expect((await lookup.json() as { partner_must_call: string }).partner_must_call).toBe("AbraxasPartnerKit.verifyReceiptId");
  });
});
