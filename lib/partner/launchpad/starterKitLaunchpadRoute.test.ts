// FILE: lib/partner/launchpad/starterKitLaunchpadRoute.test.ts
// Build 889 — real Launchpad starter-kit route path (binding_id, tenant, stale binding).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";
import { buildLaunchpadStarterKitRequestBody } from "@/lib/partner/starterKit/launchpadClientRequest";

const resolveSessionMock = vi.fn();
const getAppMock = vi.fn();
const resolveBindingMock = vi.fn();
const generateMock = vi.fn();

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  resolvePartnerConsoleSession: (...args: unknown[]) => resolveSessionMock(...args),
  requirePartnerConsoleSession: async (req: NextRequest) => {
    const session = await resolveSessionMock(req);
    if (!session) return { ok: false, error: "Partner console sign in required", status: 401 };
    return { ok: true, session };
  },
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => getAppMock(...args),
}));

vi.mock("@/lib/partner/launchpad/resolveApplicationPolicyBinding", () => ({
  resolveApplicationPolicyBinding: (...args: unknown[]) => resolveBindingMock(...args),
}));

vi.mock("@/lib/partner/starterKit/generate", () => ({
  generateStarterKit: (...args: unknown[]) => generateMock(...args),
}));

import { POST } from "@/app/api/launchpad/applications/[id]/starter-kit/route";

const appRow = {
  id: "app-wallet",
  partner_id: "partner-a",
  public_slug: "acme-test",
  application_name: "Acme test",
  display_name: "Acme",
  environment: "sandbox",
  policy_id: "studio-acme-wallet_control-v1",
  policy_version: 1,
  policy_template_id: "wallet_control",
  allowed_return_urls: ["http://localhost:3000/callback"],
  status: "active",
};

const binding = {
  binding_id: "bind_wallet_1",
  application_id: "app-wallet",
  partner_id: "partner-a",
  policy_id: "studio-acme-wallet_control-v1",
  policy_version: 1,
  pack_id: "wallet_control",
  result_family: "wallet_control_confirmed",
  environment: "sandbox" as const,
  status: "active",
  binding_role: "primary" as const,
  production_authorized: false,
  policy_production_eligible: false,
  created_at: null,
};

function post(appId: string, body: unknown, cookie = true) {
  return POST(
    new NextRequest(`http://localhost/api/launchpad/applications/${appId}/starter-kit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie: "abraxas_partner_console_session=test" } : {}),
      },
      body: JSON.stringify(body),
    }),
    { params: { id: appId } },
  );
}

describe("Launchpad starter-kit route contract", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    vi.clearAllMocks();
    resolveSessionMock.mockResolvedValue({
      partnerId: "partner-a",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    getAppMock.mockResolvedValue(appRow);
    resolveBindingMock.mockResolvedValue({ ok: true, binding });
    generateMock.mockReturnValue({
      ok: true,
      files: [{ path: "README.md", contents: "# Abraxas" }],
      archive_base64: "AA==",
      filename: "kit.zip",
    });
  });

  it("accepts binding_id + platform (founder Production repro) without unknown_field", async () => {
    const body = buildLaunchpadStarterKitRequestBody({
      bindingId: "bind_wallet_1",
      path: "hosted_partner_flow",
      platform: "wix_velo",
      capabilities: [],
    });
    const res = await post("app-wallet", body);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(generateMock).toHaveBeenCalled();
  });

  it("returns 401 without partner session", async () => {
    resolveSessionMock.mockResolvedValue(null);
    const res = await post("app-wallet", buildLaunchpadStarterKitRequestBody({
      bindingId: "bind_wallet_1",
      path: "hosted_partner_flow",
      platform: "wix_velo",
    }));
    expect(res.status).toBe(401);
    expect(getAppMock).not.toHaveBeenCalled();
  });

  it("returns 404 when application is not owned by session tenant", async () => {
    getAppMock.mockResolvedValue(null);
    const res = await post("app-other-tenant", buildLaunchpadStarterKitRequestBody({
      bindingId: "bind_wallet_1",
      path: "hosted_partner_flow",
      platform: "wix_velo",
    }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when binding resolution fails (stale or wrong binding)", async () => {
    resolveBindingMock.mockResolvedValue({ ok: false, code: "POLICY_BINDING_NOT_FOUND" });
    const res = await post("app-wallet", buildLaunchpadStarterKitRequestBody({
      bindingId: "bind_stale",
      path: "hosted_partner_flow",
      platform: "wix_velo",
    }));
    expect(res.status).toBe(400);
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("rejects unknown client fields with unknown_field", async () => {
    const res = await post("app-wallet", {
      ...buildLaunchpadStarterKitRequestBody({
        bindingId: "bind_wallet_1",
        path: "hosted_partner_flow",
        platform: "wix_velo",
      }),
      unexpected: true,
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code ?? json.error).toBe("unknown_field");
  });
});
