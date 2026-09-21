import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";

const mockResolveAdminAccess = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  resolveAdminAccess: (...args: unknown[]) => mockResolveAdminAccess(...args),
}));

import { GET, POST } from "@/app/api/admin/verification-issuer-trust/route";

describe("verification issuer trust routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLaunchpadRateLimitStoreForTests();
    mockResolveAdminAccess.mockResolvedValue({ authorized: true, reason: "allowlisted_email", allowlist_configured: true });
  });

  it("denies unsigned access and rejects browser publication", async () => {
    mockResolveAdminAccess.mockResolvedValue({ authorized: false, reason: "no_session", allowlist_configured: true });
    expect((await GET(new NextRequest("http://localhost/api/admin/verification-issuer-trust"))).status).toBe(401);

    mockResolveAdminAccess.mockResolvedValue({ authorized: true, reason: "allowlisted_email", allowlist_configured: true });
    const published = await POST(new NextRequest("http://localhost/api/admin/verification-issuer-trust", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify({ issuer_id: "other", activate_production: true }),
    }));
    expect(published.status).toBe(400);
    expect((await published.json() as { error: string }).error).toBe("verification_issuer_trust_client_override_rejected");
  });

  it("returns the source-controlled registry without execution claims", async () => {
    const res = await GET(new NextRequest("http://localhost/api/admin/verification-issuer-trust"));
    expect(res.status).toBe(200);
    const json = await res.json() as { creates_policy: boolean; activates_mainnet: boolean; items: unknown[] };
    expect(json.creates_policy).toBe(false);
    expect(json.activates_mainnet).toBe(false);
    expect(json.items.length).toBeGreaterThan(3);
  });
});
