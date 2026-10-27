import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authenticatePartnerMock = vi.fn();

vi.mock("@/lib/partner/partnerAuth", () => ({
  authenticatePartner: (...args: unknown[]) => authenticatePartnerMock(...args),
}));

describe("POST /api/launchpad/auth/session API key path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticatePartnerMock.mockResolvedValue({
      ok: true,
      ctx: {
        partnerId: "studio-test-partner",
        apiKeyId: "key-uuid-863",
        keyPrefix: "abx_test_prefix",
      },
    });
  });

  it("returns launchpad_console_session_unconfigured when browser session secret is absent", async () => {
    delete process.env.ABRAXAS_BROWSER_SESSION_SECRET;

    const { POST } = await import("@/app/api/launchpad/auth/session/route");
    const res = await POST(
      new NextRequest("http://localhost/api/launchpad/auth/session", {
        method: "POST",
        headers: { authorization: "Bearer abx_test_synthetic_key_for_route" },
      }),
    );

    expect(res.status).toBe(503);
    const body = await res.json() as { code?: string };
    expect(body.code).toBe("launchpad_console_session_unconfigured");
  });
});
