// FILE: lib/partner/partnerVerifyOAuthCallback.test.ts

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockComplete = vi.fn();
const mockEnsureReady = vi.fn();
const mockLoadSession = vi.fn();
const mockParseToken = vi.fn();
const mockPeek = vi.fn();
const mockConsume = vi.fn();
const mockClearLogin = vi.fn();
const mockClearStale = vi.fn();

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
  peekPartnerVerifyResumePath: () => mockPeek(),
  consumePartnerVerifyResumePath: () => mockConsume(),
  appendPartnerAuthReadyQuery: (path: string) => `${path}&partner_auth=ready`,
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
    mockPeek.mockReturnValue("/partner/verify?partner_id=test");
    mockConsume.mockReturnValue("/partner/verify?partner_id=test");
  });

  it("awaits browser session before consuming resume", async () => {
    const order: string[] = [];
    mockEnsureReady.mockImplementation(async () => {
      order.push("browser_session");
      return { ok: true };
    });
    mockConsume.mockImplementation(() => {
      order.push("consume");
      return "/partner/verify?partner_id=test";
    });

    await completePartnerVerifyOAuthCallback("#id_token=test");

    expect(order).toEqual(["browser_session", "consume"]);
    expect(mockClearLogin).toHaveBeenCalled();
  });

  it("does not consume resume when browser session is not ready", async () => {
    mockEnsureReady.mockResolvedValue({ ok: false, error: "failed" });

    await expect(completePartnerVerifyOAuthCallback("#id_token=test")).rejects.toThrow();
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockClearLogin).toHaveBeenCalled();
  });

  it("clears login in flight after successful callback", async () => {
    await completePartnerVerifyOAuthCallback("#id_token=test");
    expect(mockClearLogin).toHaveBeenCalled();
  });
});
