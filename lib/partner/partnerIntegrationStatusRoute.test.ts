import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const authenticatePartnerMock = vi.fn();
const getPartnerIntegrationStatusMock = vi.fn();

vi.mock("@/lib/partner/partnerAuth", () => ({
  authenticatePartner: (...args: unknown[]) => authenticatePartnerMock(...args),
}));

vi.mock("@/lib/partner/partnerIntegrationStatus", () => ({
  getPartnerIntegrationStatus: (...args: unknown[]) => getPartnerIntegrationStatusMock(...args),
}));

import { GET } from "@/app/api/partner/integration-status/route";

const partnerAStatus = {
  partner_id: "partner-a",
  key_environment: "sandbox" as const,
  key_prefix: "abx_test_abc",
  sandbox_notice: "Sandbox access cannot be used for Production access.",
  wiring: {
    return_urls_configured: true,
    return_url_count: 1,
    active_policy_configured: true,
    policy_id: "policy-a-v1",
    webhook_enabled: false,
    partner_flow_ready: true,
  },
  docs: {
    partner_flow_guide: "/docs/partner-flow",
    integration_status_endpoint: "/api/partner/integration-status",
  },
};

const partnerBStatus = {
  ...partnerAStatus,
  partner_id: "partner-b",
  key_prefix: "abx_test_def",
  wiring: {
    ...partnerAStatus.wiring,
    policy_id: "policy-b-v1",
  },
};

describe("partner integration-status API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no API key is provided", async () => {
    authenticatePartnerMock.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost/api/partner/integration-status"));
    const body = await res.json() as { error: string };

    expect(res.status).toBe(401);
    expect(body.error).toBe("API key required");
    expect(getPartnerIntegrationStatusMock).not.toHaveBeenCalled();
  });

  it("returns 200 for a valid abx_test_ key", async () => {
    authenticatePartnerMock.mockResolvedValue({
      ok: true,
      ctx: {
        partnerId: "partner-a",
        apiKeyId: "key-1",
        displayName: "Partner A",
        keyPrefix: "abx_test_abc",
        scopes: [],
      },
    });
    getPartnerIntegrationStatusMock.mockResolvedValue(partnerAStatus);

    const res = await GET(
      new NextRequest("http://localhost/api/partner/integration-status", {
        headers: { Authorization: "Bearer abx_test_integration_key" },
      }),
    );
    const body = await res.json() as { ok: boolean; integration_status: typeof partnerAStatus };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.integration_status.partner_id).toBe("partner-a");
    expect(getPartnerIntegrationStatusMock).toHaveBeenCalledWith("partner-a", "abx_test_abc");
  });

  it("returns only the authenticated partner's data", async () => {
    authenticatePartnerMock.mockResolvedValue({
      ok: true,
      ctx: {
        partnerId: "partner-a",
        apiKeyId: "key-1",
        displayName: "Partner A",
        keyPrefix: "abx_test_abc",
        scopes: [],
      },
    });
    getPartnerIntegrationStatusMock.mockResolvedValue(partnerAStatus);

    const res = await GET(new NextRequest("http://localhost/api/partner/integration-status"));
    const body = await res.json() as { integration_status: typeof partnerAStatus };

    expect(body.integration_status.partner_id).toBe("partner-a");
    expect(body.integration_status.wiring.policy_id).toBe("policy-a-v1");
    expect(JSON.stringify(body)).not.toContain("partner-b");
    expect(getPartnerIntegrationStatusMock).toHaveBeenCalledWith("partner-a", "abx_test_abc");
  });

  it("does not leak cross-partner data across auth contexts", async () => {
    authenticatePartnerMock.mockResolvedValue({
      ok: true,
      ctx: {
        partnerId: "partner-b",
        apiKeyId: "key-2",
        displayName: "Partner B",
        keyPrefix: "abx_test_def",
        scopes: [],
      },
    });
    getPartnerIntegrationStatusMock.mockResolvedValue(partnerBStatus);

    const res = await GET(
      new NextRequest("http://localhost/api/partner/integration-status?partner_id=partner-a"),
    );
    const body = await res.json() as { integration_status: typeof partnerBStatus };

    expect(res.status).toBe(200);
    expect(body.integration_status.partner_id).toBe("partner-b");
    expect(JSON.stringify(body)).not.toContain("partner-a");
    expect(getPartnerIntegrationStatusMock).toHaveBeenCalledWith("partner-b", "abx_test_def");
    expect(getPartnerIntegrationStatusMock).not.toHaveBeenCalledWith("partner-a", expect.anything());
  });

  it("ignores partner_id query override and uses auth context only", async () => {
    authenticatePartnerMock.mockResolvedValue({
      ok: true,
      ctx: {
        partnerId: "partner-a",
        apiKeyId: "key-1",
        displayName: "Partner A",
        keyPrefix: "abx_test_abc",
        scopes: [],
      },
    });
    getPartnerIntegrationStatusMock.mockResolvedValue(partnerAStatus);

    await GET(
      new NextRequest("http://localhost/api/partner/integration-status?partner_id=partner-b"),
    );

    expect(getPartnerIntegrationStatusMock).toHaveBeenCalledTimes(1);
    expect(getPartnerIntegrationStatusMock).toHaveBeenCalledWith("partner-a", "abx_test_abc");
  });
});
