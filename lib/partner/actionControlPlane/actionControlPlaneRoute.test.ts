// FILE: lib/partner/actionControlPlane/actionControlPlaneRoute.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";

const resolvePartnerConsoleSessionMock = vi.fn();
const getAppMock = vi.fn();
const buildViewMock = vi.fn();

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

vi.mock("@/lib/partner/actionControlPlane/load", () => ({
  buildActionControlPlaneForApplication: (...args: unknown[]) => buildViewMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({}),
  getSupabaseAdmin: () => null,
}));

describe("action control plane route", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    vi.clearAllMocks();
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    getAppMock.mockResolvedValue(null);
    buildViewMock.mockResolvedValue({ ok: true, application: { id: "app-a" } });
  });

  it("rejects unauthenticated reads", async () => {
    const { GET } = await import("@/app/api/launchpad/applications/[id]/action-control-plane/route");
    const res = await GET(
      new NextRequest("http://localhost/api/launchpad/applications/app-a/action-control-plane"),
      { params: { id: "app-a" } },
    );
    expect(res.status).toBe(401);
    expect(getAppMock).not.toHaveBeenCalled();
  });

  it("does not load another tenant application", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue({
      partnerId: "partner-a",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    getAppMock.mockResolvedValue(null);
    const { GET } = await import("@/app/api/launchpad/applications/[id]/action-control-plane/route");
    const res = await GET(
      new NextRequest("http://localhost/api/launchpad/applications/app-b/action-control-plane", {
        headers: { cookie: "abraxas_partner_console_session=test" },
      }),
      { params: { id: "app-b" } },
    );
    expect(res.status).toBe(404);
    expect(getAppMock).toHaveBeenCalledWith("app-b", "partner-a");
    expect(buildViewMock).not.toHaveBeenCalled();
  });

  it("denies Production upgrade actions", async () => {
    resolvePartnerConsoleSessionMock.mockResolvedValue({
      partnerId: "partner-a",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    getAppMock.mockResolvedValue({ id: "app-a", partner_id: "partner-a" });
    const { POST } = await import("@/app/api/launchpad/applications/[id]/action-control-plane/route");
    const res = await POST(
      new NextRequest("http://localhost/api/launchpad/applications/app-a/action-control-plane", {
        method: "POST",
        headers: {
          cookie: "abraxas_partner_console_session=test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: "activate_production" }),
      }),
      { params: { id: "app-a" } },
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("production_upgrade_requires_review");
    expect(body.ok).toBe(false);
  });
});
