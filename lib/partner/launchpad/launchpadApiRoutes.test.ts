// FILE: lib/partner/launchpad/launchpadApiRoutes.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const resolvePartnerConsoleSessionMock = vi.fn();
const requireSupabaseAdminMock = vi.fn();
const buildWorkspaceMock = vi.fn();

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

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => requireSupabaseAdminMock(),
}));

describe("launchpad API authorization boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvePartnerConsoleSessionMock.mockResolvedValue(null);
    buildWorkspaceMock.mockResolvedValue({ partner_id: "acme", applications: [] });
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
});
