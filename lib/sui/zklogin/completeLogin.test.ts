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

vi.mock("@/lib/auth/ensureBrowserSession", () => ({
  ensureBrowserSession: vi.fn().mockResolvedValue({ ok: true }),
}));

import { loadPendingSession, loadUserSession } from "./session";
import { completeGoogleZkLogin } from "./completeLogin";
import { fakeGoogleIdToken } from "./testJwt";
import { jwtToAddress } from "@mysten/sui/zklogin";

const LEGACY_OAUTH_CLIENT_ID = "187000000000-legacyclient.apps.googleusercontent.com";
const NEW_OAUTH_CLIENT_ID = "540000000000-newclient.apps.googleusercontent.com";

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
      "Sign-in could not finish",
    );
  });

  it("rejects login when OAuth client ID changed but server still returns legacy address", async () => {
    const oauthSub = "dgv-test-google-sub-12345";
    const userSalt = "982451653";
    const legacyToken = fakeGoogleIdToken({ sub: oauthSub, aud: LEGACY_OAUTH_CLIENT_ID });
    const newToken = fakeGoogleIdToken({ sub: oauthSub, aud: NEW_OAUTH_CLIENT_ID });
    const legacyAddress = jwtToAddress(legacyToken, userSalt);

    vi.mocked(loadPendingSession).mockReturnValue({
      ephemeralSecretKey: "ephemeral-secret-key",
      randomness: "randomness",
      maxEpoch: 110,
      provider: "google",
      startedAt: new Date().toISOString(),
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        sui_address: legacyAddress,
        user_salt: userSalt,
        provider: "google",
        oauth_sub: oauthSub,
      }),
    } as Response);

    await expect(completeGoogleZkLogin(newToken)).rejects.toThrow(
      /could not verify your Passport/i,
    );
  });
});
