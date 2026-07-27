// FILE: lib/sui/zklogin/completeLogin.test.ts

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

vi.mock("./session", () => ({
  loadPendingSession: vi.fn(),
  loadUserSession: vi.fn(),
  saveUserSession: vi.fn(),
  clearPendingSession: vi.fn(),
}));

vi.mock("./signingSession", () => ({
  persistEphemeralKey: vi.fn(),
  saveSigningSession: vi.fn(),
}));

import { loadPendingSession, loadUserSession } from "./session";
import { completeGoogleZkLogin } from "./completeLogin";

describe("completeGoogleZkLogin", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns existing session when pending is missing (callback re-entry)", async () => {
    vi.mocked(loadPendingSession).mockReturnValue(null);
    vi.mocked(loadUserSession).mockReturnValue({
      suiAddress: "0xabc",
      provider: "google",
      oauthSub: "sub",
      maxEpoch: 100,
      loggedInAt: new Date().toISOString(),
    });

    const session = await completeGoogleZkLogin("token");
    expect(session.suiAddress).toBe("0xabc");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when pending and existing session are both missing", async () => {
    vi.mocked(loadPendingSession).mockReturnValue(null);
    vi.mocked(loadUserSession).mockReturnValue(null);

    await expect(completeGoogleZkLogin("token")).rejects.toThrow(
      "Login session expired. Please sign in again.",
    );
  });
});
