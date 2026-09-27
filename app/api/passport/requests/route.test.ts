import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";

const sessionMock = vi.fn();
const listMock = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => sessionMock(...args),
}));
vi.mock("@/lib/passport/passportRequestInbox", () => ({
  listPassportRequestInbox: (...args: unknown[]) => listMock(...args),
}));

import { GET } from "./route";

const SUBJECT = "0x" + "a".repeat(64);

describe("GET /api/passport/requests", () => {
  beforeEach(() => {
    resetLaunchpadRateLimitStoreForTests();
    vi.clearAllMocks();
    sessionMock.mockResolvedValue({ ok: true, session: { suiAddress: SUBJECT } });
    listMock.mockResolvedValue([]);
  });

  it("requires a Passport browser session", async () => {
    sessionMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const response = await GET(new NextRequest("http://localhost/api/passport/requests"));
    expect(response.status).toBe(401);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("uses only the session subject", async () => {
    listMock.mockResolvedValueOnce([{
      request_ref: "request:vr-123",
      partner_label: "Example",
      request_title: "Eligibility",
      purpose: "Confirm eligibility",
      shared_result: "Eligibility result",
      received_at: "2026-09-27T10:00:00.000Z",
      expires_at: "2026-09-28T10:00:00.000Z",
      continue_href: "/partner/continue?verify_request=vr-123",
    }]);

    const response = await GET(new NextRequest(
      "http://localhost/api/passport/requests?subject=0xother",
    ));
    expect(response.status).toBe(200);
    expect(listMock).toHaveBeenCalledWith(SUBJECT);
    const body = await response.json();
    expect(body.requests).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain("0xother");
  });

  it("fails closed when the inbox store is unavailable", async () => {
    listMock.mockRejectedValueOnce(new Error("database unavailable"));
    const response = await GET(new NextRequest("http://localhost/api/passport/requests"));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("Partner requests are temporarily unavailable.");
  });
});
