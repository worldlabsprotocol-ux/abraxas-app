import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";

const resolvePartnerConsoleSessionMock = vi.fn();
const getAppMock = vi.fn();
const adoptMock = vi.fn();
const updateMock = vi.fn();

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

vi.mock("@/lib/policy/changeControl/adoption", () => ({
  adoptPolicyVersionForApplication: (...args: unknown[]) => adoptMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: () => ({ update: updateMock }) }),
  getSupabaseAdmin: () => null,
}));

import { GET, POST } from "@/app/api/launchpad/applications/[id]/policy-version-plan/route";

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

describe("policy-version-plan route", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    vi.clearAllMocks();
    resolvePartnerConsoleSessionMock.mockResolvedValue({ partnerId: "acme" });
    getAppMock.mockResolvedValue(app);
  });

  it("denies unsigned requests", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    const res = await GET(get("http://localhost/api/launchpad/applications/app-1/policy-version-plan", false), {
      params: { id: "app-1" },
    });
    expect(res.status).toBe(401);
    expect(getAppMock).not.toHaveBeenCalled();
  });

  it("isolates tenants by session partner and application id", async () => {
    getAppMock.mockResolvedValue(null);
    const res = await GET(get("http://localhost/api/launchpad/applications/app-b/policy-version-plan?partner_id=other"), {
      params: { id: "app-b" },
    });
    expect(res.status).toBe(403);
    expect(adoptMock).not.toHaveBeenCalled();
  });

  it("returns the server-pinned version and rejects client version query params", async () => {
    const ok = await GET(get("http://localhost/api/launchpad/applications/app-1/policy-version-plan"), {
      params: { id: "app-1" },
    });
    expect(ok.status).toBe(200);
    const json = await ok.json() as { pinned_version: number; issues_production_key: boolean };
    expect(json.pinned_version).toBe(1);
    expect(json.issues_production_key).toBe(false);

    const rejected = await GET(get("http://localhost/api/launchpad/applications/app-1/policy-version-plan?policy_version=9"), {
      params: { id: "app-1" },
    });
    expect(rejected.status).toBe(400);
  });

  it("does not mutate the pin when comparing or selecting, and denies Production activation", async () => {
    const selected = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/policy-version-plan", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "abraxas_partner_console_session=test" },
      body: JSON.stringify({ select: "planning" }),
    }), { params: { id: "app-1" } });
    expect(selected.status).toBe(200);
    const json = await selected.json() as { mutated: boolean; pinned_version: number };
    expect(json.mutated).toBe(false);
    expect(json.pinned_version).toBe(1);
    expect(adoptMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();

    const forged = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/policy-version-plan", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "abraxas_partner_console_session=test" },
      body: JSON.stringify({ policy_version: 2, target_version: 2 }),
    }), { params: { id: "app-1" } });
    expect(forged.status).toBe(400);

    const denied = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/policy-version-plan", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "abraxas_partner_console_session=test" },
      body: JSON.stringify({ activate_production: true }),
    }), { params: { id: "app-1" } });
    expect(denied.status).toBe(403);
  });
});
