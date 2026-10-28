// FILE: lib/partner/hostedHandoff/partnerHandoffRoute.test.ts
// Build 890 — partner handoff create route contract.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildPartnerHandoffCreateRequestBody } from "./handoffClientRequest";

const authMock = vi.fn();
const getAppByIdMock = vi.fn();
const getAppForPartnerMock = vi.fn();
const resolveBindingMock = vi.fn();
const loadConfigMock = vi.fn();
const createHandoffMock = vi.fn();
const projectMock = vi.fn();
const handoffLeaksMock = vi.fn();

vi.mock("@/lib/partner/partnerAuth", () => ({
  authenticatePartnerScoped: (...args: unknown[]) => authMock(...args),
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationById: (...args: unknown[]) => getAppByIdMock(...args),
  getLaunchpadApplicationForPartner: (...args: unknown[]) => getAppForPartnerMock(...args),
}));

vi.mock("@/lib/partner/launchpad/resolveApplicationPolicyBinding", () => ({
  resolveApplicationPolicyBinding: (...args: unknown[]) => resolveBindingMock(...args),
}));

vi.mock("@/lib/partner/launchpad/partnerFlowRequest", () => ({
  loadPartnerFlowStoredConfig: (...args: unknown[]) => loadConfigMock(...args),
}));

vi.mock("@/lib/partner/hostedHandoff", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/hostedHandoff")>();
  return {
    ...actual,
    createHostedHandoff: (...args: unknown[]) => createHandoffMock(...args),
    projectPartner: (...args: unknown[]) => projectMock(...args),
    handoffLeaks: (...args: unknown[]) => handoffLeaksMock(...args),
  };
});

import { POST } from "@/app/api/v1/partner-handoff/route";

const appRow = {
  id: "app-1",
  partner_id: "partner-a",
  production_activated_at: null,
  allowed_return_urls: ["https://example.com/cb"],
};

const binding = {
  environment: "sandbox" as const,
};

function post(body: unknown, appId = "app-1") {
  return POST(
    new NextRequest("http://localhost/api/v1/partner-handoff", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer abx_test",
        "x-abraxas-application-id": appId,
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("partner handoff create route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAppByIdMock.mockResolvedValue(appRow);
    getAppForPartnerMock.mockResolvedValue(appRow);
    resolveBindingMock.mockResolvedValue({ ok: true, binding });
    authMock.mockResolvedValue({ ok: true, ctx: { partnerId: "partner-a" } });
    loadConfigMock.mockResolvedValue({});
    createHandoffMock.mockResolvedValue({ handoff_ref: "ho_1" });
    projectMock.mockReturnValue({
      hosted_url: "https://demo/hosted",
      verify_request: "vr_1",
      handoff_ref: "ho_1",
    });
    handoffLeaksMock.mockReturnValue([]);
  });

  it("accepts canonical handoff body", async () => {
    const res = await post(buildPartnerHandoffCreateRequestBody({ bindingId: "bind_1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(createHandoffMock).toHaveBeenCalled();
  });

  it("rejects unknown_field for rogue keys", async () => {
    const body = { ...buildPartnerHandoffCreateRequestBody({}), forged_partner: "x" };
    const res = await post(body);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("unknown_field");
  });

  it("rejects client_override for forbidden policy_id", async () => {
    const res = await post({ runtime: "universal_https", policy_id: "evil" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("client_override_rejected");
  });

  it("returns unauthorized when partner auth fails", async () => {
    authMock.mockResolvedValue({ ok: false, error: "invalid_key", status: 401 });
    const res = await post(buildPartnerHandoffCreateRequestBody({}));
    expect(res.status).toBe(401);
  });
});
