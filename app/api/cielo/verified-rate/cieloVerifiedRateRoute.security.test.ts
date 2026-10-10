import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as consentPOST } from "@/app/api/cielo/verified-rate/consent/route";
import { POST as submitPOST } from "@/app/api/cielo/verified-rate/submit/route";

const requireBrowserSession = vi.fn();

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => requireBrowserSession(...args),
}));

vi.mock("@/lib/cielo/verifiedRateService", () => ({
  grantCieloVerifiedGuestConsent: vi.fn(),
  submitVerifiedRateRequest: vi.fn(),
}));

vi.mock("@/lib/cielo/cieloFunnelEvents", () => ({
  recordCieloFunnelEvent: vi.fn(async () => undefined),
}));

describe("Cielo verified-rate route security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consent returns 401 without browser session", async () => {
    requireBrowserSession.mockResolvedValueOnce({ ok: false, status: 401, error: "Sign in required" });
    const res = await consentPOST(new NextRequest("http://localhost/api/cielo/verified-rate/consent", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("submit returns 401 without browser session", async () => {
    requireBrowserSession.mockResolvedValueOnce({ ok: false, status: 401, error: "Sign in required" });
    const res = await submitPOST(new NextRequest("http://localhost/api/cielo/verified-rate/submit", {
      method: "POST",
      body: JSON.stringify({ verification_decision_id: "x", consent_receipt_id: "y", guest_name: "a", contact_email: "b@c.com" }),
      headers: { "content-type": "application/json" },
    }));
    expect(res.status).toBe(401);
  });

  it("submit rejects missing decision ids before service call", async () => {
    requireBrowserSession.mockResolvedValueOnce({
      ok: true,
      session: { suiAddress: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" },
    });
    const res = await submitPOST(new NextRequest("http://localhost/api/cielo/verified-rate/submit", {
      method: "POST",
      body: JSON.stringify({ guest_name: "a", contact_email: "b@c.com" }),
      headers: { "content-type": "application/json" },
    }));
    expect(res.status).toBe(400);
  });
});
