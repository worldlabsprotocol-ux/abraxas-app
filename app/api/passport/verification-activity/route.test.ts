import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";
import { PASSPORT_ACTIVITY_UNAVAILABLE } from "@/lib/passport/verificationActivity/contract";

const requireBrowserSessionMock = vi.fn();
const loadMock = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => requireBrowserSessionMock(...args),
}));

vi.mock("@/lib/passport/verificationActivity/load", () => ({
  loadPassportVerificationActivity: (...args: unknown[]) => loadMock(...args),
}));

import { GET } from "@/app/api/passport/verification-activity/route";

const SUBJECT = "0x" + "e".repeat(64);

function get(url: string) {
  return new NextRequest(url);
}

describe("GET /api/passport/verification-activity", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    vi.clearAllMocks();
    requireBrowserSessionMock.mockResolvedValue({
      ok: true,
      session: { suiAddress: SUBJECT },
    });
    loadMock.mockResolvedValue({
      version: "1.0.0",
      items: [],
      truncated: false,
      notice: "safe",
      explanation_href: "/docs/why-verification",
      passport_href: "/passport",
    });
  });

  it("denies unsigned requests", async () => {
    requireBrowserSessionMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Sign in required" });
    const res = await GET(get("http://localhost/api/passport/verification-activity"));
    expect(res.status).toBe(401);
    expect(loadMock).not.toHaveBeenCalled();
  });

  it("loads only the session subject and ignores client selectors", async () => {
    const res = await GET(get(
      "http://localhost/api/passport/verification-activity?subject=other&sui=0xfff&partner_id=evil&receipt_id=dr_abc",
    ));
    expect(res.status).toBe(200);
    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(loadMock).toHaveBeenCalledWith(SUBJECT);
    const body = await res.json() as { ok: boolean; items: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.items).toEqual([]);
  });

  it("returns unavailable recovery when the store fails", async () => {
    loadMock.mockRejectedValueOnce(new Error("SQLSTATE 42P01 relation decision_receipts"));
    const res = await GET(get("http://localhost/api/passport/verification-activity"));
    expect(res.status).toBe(503);
    const body = await res.json() as { error: string };
    expect(body.error).toBe(PASSPORT_ACTIVITY_UNAVAILABLE);
    expect(JSON.stringify(body)).not.toMatch(/SQLSTATE|relation /);
  });
});
