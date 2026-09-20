import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";

const resolvePartnerConsoleSessionMock = vi.fn();
const getAppMock = vi.fn();
const loadMock = vi.fn();

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

vi.mock("@/lib/partner/launchpad/webhookDeliveryHealth/load", () => ({
  loadWebhookDeliveryHealth: (...args: unknown[]) => loadMock(...args),
}));

import { GET, POST } from "@/app/api/launchpad/applications/[id]/webhook-delivery-health/route";

function get(url: string) {
  return new NextRequest(url);
}

describe("webhook delivery health route", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    vi.clearAllMocks();
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    getAppMock.mockResolvedValue(null);
    loadMock.mockResolvedValue({
      application_id: "app-1",
      webhook_configured: false,
      deliveries: [],
      notice: "notification only",
    });
  });

  it("denies unsigned requests", async () => {
    const res = await GET(get("http://localhost/api/launchpad/applications/app-1/webhook-delivery-health"), {
      params: { id: "app-1" },
    });
    expect(res.status).toBe(401);
    expect(getAppMock).not.toHaveBeenCalled();
    expect(loadMock).not.toHaveBeenCalled();
  });

  it("isolates tenants by session partner and application id", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue({ partnerId: "partner-a" });
    getAppMock.mockResolvedValue(null);
    const res = await GET(get("http://localhost/api/launchpad/applications/app-other/webhook-delivery-health?partner_id=partner-b"), {
      params: { id: "app-other" },
    });
    expect(res.status).toBe(403);
    expect(loadMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the application is not on the session tenant", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue({ partnerId: "partner-a" });
    getAppMock.mockResolvedValue(null);
    const res = await GET(get("http://localhost/api/launchpad/applications/app-1/webhook-delivery-health"), {
      params: { id: "app-1" },
    });
    expect(res.status).toBe(404);
    expect(getAppMock).toHaveBeenCalledWith("app-1", "partner-a");
    expect(loadMock).not.toHaveBeenCalled();
  });

  it("loads health for the session tenant and rejects writes", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue({ partnerId: "partner-a" });
    getAppMock.mockResolvedValue({ id: "app-1", partner_id: "partner-a", policy_id: "policy-v1" });
    const res = await GET(get("http://localhost/api/launchpad/applications/app-1/webhook-delivery-health"), {
      params: { id: "app-1" },
    });
    expect(res.status).toBe(200);
    expect(loadMock).toHaveBeenCalledWith({
      application: expect.objectContaining({ id: "app-1" }),
      partnerId: "partner-a",
    });

    const write = await POST(new NextRequest("http://localhost/api/launchpad/applications/app-1/webhook-delivery-health", {
      method: "POST",
      body: JSON.stringify({
        partner_id: "forged",
        endpoint_url: "https://evil.example/hooks",
        signing_secret: "abx_whsec_leak",
        send_test: true,
      }),
    }), { params: { id: "app-1" } });
    expect(write.status).toBe(405);
    const body = await write.json() as { error: string };
    expect(body.error).toBe("read_only");
  });
});
