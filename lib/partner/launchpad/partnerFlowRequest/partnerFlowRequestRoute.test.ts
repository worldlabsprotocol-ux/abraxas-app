import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";

const resolvePartnerConsoleSessionMock = vi.fn();
const getAppMock = vi.fn();
const loadStoredMock = vi.fn();
const saveMock = vi.fn();
const kitMock = vi.fn();
const enabledMock = vi.fn();

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

vi.mock("@/lib/partner/launchpad/partnerFlowRequest/store", () => ({
  loadPartnerFlowStoredConfig: (...args: unknown[]) => loadStoredMock(...args),
  savePartnerFlowRequestConfig: (...args: unknown[]) => saveMock(...args),
  loadStarterKitEvidenced: (...args: unknown[]) => kitMock(...args),
  loadEnabledPartnerFlowCapabilities: (...args: unknown[]) => enabledMock(...args),
  resolveStoredPartnerFlowCallback: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({}),
  getSupabaseAdmin: () => null,
}));

import { GET, POST } from "@/app/api/launchpad/applications/[id]/partner-flow-request/route";

const app = {
  id: "app-1",
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

function get(url: string, cookie = true) {
  return new NextRequest(url, {
    headers: cookie ? { cookie: "abraxas_partner_console_session=test" } : {},
  });
}

describe("partner-flow-request route", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    vi.clearAllMocks();
    resolvePartnerConsoleSessionMock.mockResolvedValue({ partnerId: "acme" });
    getAppMock.mockResolvedValue(app);
    loadStoredMock.mockResolvedValue({
      purpose: "Confirm adult retail eligibility",
      action: "retail_access",
      callback_url: "http://localhost:3000/callback",
      capabilities: [],
      display_label: "Acme",
    });
    kitMock.mockResolvedValue(true);
    enabledMock.mockResolvedValue(["webhooks"]);
    saveMock.mockResolvedValue({
      purpose: "Confirm adult retail eligibility",
      action: "retail_access",
      callback_url: "http://localhost:3000/callback",
      capabilities: [],
      display_label: "Acme",
    });
  });

  it("denies unsigned requests", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    const res = await GET(get("http://localhost/api/launchpad/applications/app-1/partner-flow-request", false), {
      params: { id: "app-1" },
    });
    expect(res.status).toBe(401);
    expect(getAppMock).not.toHaveBeenCalled();
  });

  it("isolates tenants by session partner and application id", async () => {
    getAppMock.mockResolvedValue(null);
    const res = await GET(get("http://localhost/api/launchpad/applications/app-b/partner-flow-request?partner_id=other"), {
      params: { id: "app-b" },
    });
    expect(res.status).toBe(403);
    expect(loadStoredMock).not.toHaveBeenCalled();
  });

  it("loads configuration for the session tenant with pinned policy version", async () => {
    const res = await GET(get("http://localhost/api/launchpad/applications/app-1/partner-flow-request"), {
      params: { id: "app-1" },
    });
    expect(res.status).toBe(200);
    expect(getAppMock).toHaveBeenCalledWith("app-1", "acme");
    const json = await res.json() as { policy_version: number; issues_production_key: boolean };
    expect(json.policy_version).toBe(1);
    expect(json.issues_production_key).toBe(false);
  });

  it("saves valid configuration and rejects production activation", async () => {
    const ok = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/partner-flow-request", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "abraxas_partner_console_session=test" },
      body: JSON.stringify({
        purpose: "Confirm adult retail eligibility",
        action: "retail_access",
        callback_index: 0,
        display_label: "Acme",
        capabilities: ["webhooks"],
      }),
    }), { params: { id: "app-1" } });
    expect(ok.status).toBe(200);
    expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({
      enabledCapabilities: ["webhooks"],
      parsed: expect.objectContaining({ capabilities: ["webhooks"] }),
    }));

    const denied = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/partner-flow-request", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "abraxas_partner_console_session=test" },
      body: JSON.stringify({ activate_production: true, purpose: "Confirm adult retail eligibility", action: "retail_access", callback_index: 0 }),
    }), { params: { id: "app-1" } });
    expect(denied.status).toBe(403);
  });

  it("rejects a callback that is not on the server allowlist", async () => {
    saveMock.mockRejectedValueOnce(Object.assign(new Error("callback_rejected"), { code: "callback_rejected" }));
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/partner-flow-request", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "abraxas_partner_console_session=test" },
      body: JSON.stringify({
        purpose: "Confirm adult retail eligibility",
        action: "retail_access",
        callback_index: 9,
      }),
    }), { params: { id: "app-1" } });
    expect(res.status).toBe(400);
  });

  it("rejects forged trading payment wallet webhook and solana capabilities", async () => {
    enabledMock.mockResolvedValueOnce([]);
    const res = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/partner-flow-request", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "abraxas_partner_console_session=test" },
      body: JSON.stringify({
        purpose: "Confirm adult retail eligibility",
        action: "retail_access",
        callback_index: 0,
        capabilities: ["trading_venue", "payment_authorization", "wallet_standard_binding", "webhooks", "solana_gate"],
      }),
    }), { params: { id: "app-1" } });
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("capability_rejected");
    expect(saveMock).not.toHaveBeenCalled();
  });
});
