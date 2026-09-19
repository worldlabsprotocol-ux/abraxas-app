// FILE: lib/partner/partnerVerifyOAuthCallback.test.ts

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockComplete = vi.fn();
const mockEnsureReady = vi.fn();
const mockLoadSession = vi.fn();
const mockParseToken = vi.fn();
const mockClearLogin = vi.fn();
const mockClearStale = vi.fn();
const mockClearResume = vi.fn();

vi.mock("@/lib/sui/zklogin/completeLogin", () => ({
  completeGoogleZkLogin: (...args: unknown[]) => mockComplete(...args),
}));

vi.mock("@/lib/auth/ensureBrowserSession", () => ({
  ensureBrowserSessionReady: (...args: unknown[]) => mockEnsureReady(...args),
}));

vi.mock("@/lib/sui/zklogin/session", () => ({
  loadUserSession: () => mockLoadSession(),
  parseIdTokenFromCallbackHash: (...args: unknown[]) => mockParseToken(...args),
}));

vi.mock("@/lib/partner/partnerVerifyResume", () => ({
  clearPartnerVerifyResume: () => mockClearResume(),
}));

vi.mock("@/lib/sui/zklogin/loginInFlight", () => ({
  clearLoginInFlight: () => mockClearLogin(),
  clearStaleLoginInFlight: () => mockClearStale(),
}));

describe("completePartnerVerifyOAuthCallback", () => {
  let completePartnerVerifyOAuthCallback: typeof import("./partnerVerifyOAuthCallback").completePartnerVerifyOAuthCallback;

  beforeAll(async () => {
    ({ completePartnerVerifyOAuthCallback } = await import("./partnerVerifyOAuthCallback"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadSession.mockReturnValue(null);
    mockParseToken.mockReturnValue("id-token");
    mockComplete.mockResolvedValue({ suiAddress: "0xabc" });
    mockEnsureReady.mockResolvedValue({ ok: true });
  });

  it("awaits browser session before activating continuation", async () => {
    const order: string[] = [];
    mockEnsureReady.mockImplementation(async () => {
      order.push("browser_session");
      return { ok: true };
    });
    global.fetch = vi.fn().mockImplementation(async () => {
      order.push("activate");
      return new Response(JSON.stringify({
        ok: true,
        issuedReceipt: false,
        continuePath: "/partner/continue?verify_request=vr-1&partner_id=test&policy_id=policy-v1",
      }), { status: 200 });
    }) as typeof fetch;

    const result = await completePartnerVerifyOAuthCallback("#id_token=test");

    expect(order).toEqual(["browser_session", "activate"]);
    expect(result.redirectPath).toBe(
      "/partner/continue?verify_request=vr-1&partner_id=test&policy_id=policy-v1",
    );
    expect(result.redirectPath).not.toContain("return");
    expect(mockClearLogin).toHaveBeenCalled();
  });

  it("does not activate when browser session is not ready", async () => {
    mockEnsureReady.mockResolvedValue({ ok: false, error: "failed" });
    global.fetch = vi.fn() as typeof fetch;

    await expect(completePartnerVerifyOAuthCallback("#id_token=test")).rejects.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockClearLogin).toHaveBeenCalled();
  });

  it("falls back to Passport without issuing a receipt when activate cannot run", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      code: "missing",
    }), { status: 404 })) as typeof fetch;

    const result = await completePartnerVerifyOAuthCallback("#id_token=test");
    expect(result.redirectPath).toBe("/passport?signed_in=1");
  });

  it("ignores activate payloads that are not restorable continue paths", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      issuedReceipt: false,
      continuePath: "https://evil.example/partner/continue",
    }), { status: 200 })) as typeof fetch;

    const result = await completePartnerVerifyOAuthCallback("#id_token=test");
    expect(result.redirectPath).toBe("/passport?signed_in=1");
  });

  it("never treats callback query parameters as resume state", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      issuedReceipt: false,
      continuePath: "/partner/continue?verify_request=vr-1&partner_id=test&policy_id=policy-v1",
    }), { status: 200 })) as typeof fetch;

    await completePartnerVerifyOAuthCallback("#id_token=test&partner_id=attacker&return_url=https://evil.example");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/partner-verify/resume/activate",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string);
    expect(body).toEqual({});
  });
});
