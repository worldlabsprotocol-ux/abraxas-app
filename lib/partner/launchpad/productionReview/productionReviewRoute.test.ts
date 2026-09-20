// FILE: lib/partner/launchpad/productionReview/productionReviewRoute.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";

const mockResolveAdminAccess = vi.fn();
const decideMock = vi.fn();
const loadMock = vi.fn();

vi.mock("@/lib/adminAuth", () => ({
  resolveAdminAccess: (...args: unknown[]) => mockResolveAdminAccess(...args),
}));

vi.mock("@/lib/partner/launchpad/productionReview", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/partner/launchpad/productionReview")>();
  return {
    ...actual,
    decideProductionReview: (...args: unknown[]) => decideMock(...args),
    loadProductionReviewQueue: (...args: unknown[]) => loadMock(...args),
  };
});

import { GET } from "@/app/api/admin/production-review/route";
import { POST } from "@/app/api/admin/production-review/[id]/decide/route";

function post(body: unknown, origin = "http://localhost") {
  return POST(
    new NextRequest("http://localhost/api/admin/production-review/req-1/decide", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify(body),
    }),
    { params: { id: "req-1" } },
  );
}

describe("production review operator routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLaunchpadRateLimitStoreForTests();
    mockResolveAdminAccess.mockResolvedValue({ authorized: true, reason: "allowlisted_email", allowlist_configured: true });
    loadMock.mockResolvedValue({
      ok: true,
      issues_production_key: false,
      activates_mainnet: false,
      executes: false,
      items: [],
    });
    decideMock.mockResolvedValue({
      ok: true,
      decision: "approved",
      replay: false,
      issues_production_key: false,
      activates_mainnet: false,
      executes: false,
    });
  });

  it("denies unauthenticated and non-operator access", async () => {
    mockResolveAdminAccess.mockResolvedValue({ authorized: false, reason: "no_session", allowlist_configured: true });
    expect((await GET(new NextRequest("http://localhost/api/admin/production-review"))).status).toBe(401);
    mockResolveAdminAccess.mockResolvedValue({ authorized: false, reason: "email_not_allowlisted", allowlist_configured: true });
    expect((await GET(new NextRequest("http://localhost/api/admin/production-review"))).status).toBe(403);
    expect(loadMock).not.toHaveBeenCalled();
  });

  it("requires CSRF origin and rejects client authority fields", async () => {
    const missing = await POST(
      new NextRequest("http://localhost/api/admin/production-review/req-1/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "approve", confirm: true }),
      }),
      { params: { id: "req-1" } },
    );
    expect(missing.status).toBe(403);
    const override = await post({ decision: "approve", confirm: true, activate_production: true });
    expect(override.status).toBe(400);
    expect((await override.json() as { error: string }).error).toBe("production_review_client_override_rejected");
    expect(decideMock).not.toHaveBeenCalled();
  });

  it("approves with explicit confirmation and never claims key issuance", async () => {
    const res = await post({ decision: "approve", confirm: true });
    expect(res.status).toBe(200);
    const json = await res.json() as { issues_production_key: boolean; activates_mainnet: boolean; executes: boolean };
    expect(json.issues_production_key).toBe(false);
    expect(json.activates_mainnet).toBe(false);
    expect(json.executes).toBe(false);
    expect(decideMock).toHaveBeenCalledWith({
      requestId: "req-1",
      decision: "approve",
      confirm: true,
      remediationClass: null,
    });
  });

  it("returns safe remediation on reject and replays existing decisions", async () => {
    decideMock.mockResolvedValueOnce({
      ok: true,
      decision: "rejected",
      replay: true,
      issues_production_key: false,
      activates_mainnet: false,
      executes: false,
      remediation_class: "resubmit_after_rejection",
    });
    const res = await post({ decision: "reject", confirm: true, remediation_class: "resubmit_after_rejection" });
    expect(res.status).toBe(200);
    const json = await res.json() as { replay: boolean; remediation_class: string };
    expect(json.replay).toBe(true);
    expect(json.remediation_class).toBe("resubmit_after_rejection");
  });
});
