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

import { loadPendingSession, loadUserSession, saveUserSession } from "./session";
import {
  completeGoogleZkLogin,
  mapRegisterFailureToUserError,
} from "./completeLogin";
import { fakeGoogleIdToken } from "./testJwt";
import { jwtToAddress } from "@mysten/sui/zklogin";
import { ZKLOGIN_SIGN_IN_COPY } from "./signInCopy";
import { ZKLOGIN_OAUTH_STATE } from "./loginMode";

const LEGACY_OAUTH_CLIENT_ID = "187000000000-legacyclient.apps.googleusercontent.com";
const NEW_OAUTH_CLIENT_ID = "540000000000-newclient.apps.googleusercontent.com";

const basePending = {
  ephemeralSecretKey: "ephemeral-secret-key",
  randomness: "randomness",
  maxEpoch: 110,
  provider: "google" as const,
  startedAt: new Date().toISOString(),
};

describe("completeGoogleZkLogin", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID = NEW_OAUTH_CLIENT_ID;
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID = LEGACY_OAUTH_CLIENT_ID;
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
      ...basePending,
      loginMode: "canonical",
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

  it("sends legacy_recovery login_mode for legacy pending session", async () => {
    const oauthSub = "dgv-test-google-sub-12345";
    const userSalt = "982451653";
    const legacyToken = fakeGoogleIdToken({ sub: oauthSub, aud: LEGACY_OAUTH_CLIENT_ID });
    const legacyAddress = jwtToAddress(legacyToken, userSalt);

    vi.mocked(loadPendingSession).mockReturnValue({
      ...basePending,
      loginMode: "legacy_recovery",
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

    await completeGoogleZkLogin(legacyToken);

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { login_mode?: string };
    expect(body.login_mode).toBe("legacy_recovery");
    expect(saveUserSession).toHaveBeenCalled();
  });

  it("recovers legacy login_mode from OAuth callback state when pending omits it", async () => {
    const oauthSub = "dgv-test-google-sub-12345";
    const userSalt = "982451653";
    const legacyToken = fakeGoogleIdToken({ sub: oauthSub, aud: LEGACY_OAUTH_CLIENT_ID });
    const legacyAddress = jwtToAddress(legacyToken, userSalt);

    vi.mocked(loadPendingSession).mockReturnValue(basePending);

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        sui_address: legacyAddress,
        user_salt: userSalt,
        provider: "google",
        oauth_sub: oauthSub,
      }),
    } as Response);

    await completeGoogleZkLogin(legacyToken, {
      callbackHash: `#id_token=x&state=${ZKLOGIN_OAUTH_STATE.legacy_recovery}`,
    });

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { login_mode?: string };
    expect(body.login_mode).toBe("legacy_recovery");
  });

  it("does not loop legacy recovery after audience mismatch — directs user to Continue with Google", async () => {
    const oauthSub = "dgv-test-google-sub-12345";
    const legacyToken = fakeGoogleIdToken({ sub: oauthSub, aud: LEGACY_OAUTH_CLIENT_ID });

    vi.mocked(loadPendingSession).mockReturnValue({
      ...basePending,
      loginMode: "legacy_recovery",
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        code: "zklogin_oauth_audience_mismatch",
        legacy_recovery_available: true,
        suggested_login_mode: "canonical",
      }),
    } as Response);

    await expect(completeGoogleZkLogin(legacyToken)).rejects.toThrow(
      ZKLOGIN_SIGN_IN_COPY.errors.wrongPathForCanonical,
    );
  });

  it("directs canonical users with legacy passports to Use an existing Passport", async () => {
    const oauthSub = "dgv-test-google-sub-12345";
    const canonicalToken = fakeGoogleIdToken({ sub: oauthSub, aud: NEW_OAUTH_CLIENT_ID });

    vi.mocked(loadPendingSession).mockReturnValue({
      ...basePending,
      loginMode: "canonical",
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        code: "zklogin_oauth_audience_mismatch",
        legacy_recovery_available: true,
        suggested_login_mode: "legacy_recovery",
      }),
    } as Response);

    await expect(completeGoogleZkLogin(canonicalToken)).rejects.toThrow(
      ZKLOGIN_SIGN_IN_COPY.errors.audienceMismatchDetail,
    );
  });
});

describe("mapRegisterFailureToUserError", () => {
  it("never re-issues legacy recovery instruction after legacy recovery 409", () => {
    const message = mapRegisterFailureToUserError(
      409,
      {
        code: "zklogin_oauth_audience_mismatch",
        legacy_recovery_available: true,
        suggested_login_mode: "canonical",
      },
      "legacy_recovery",
    );
    expect(message).toBe(ZKLOGIN_SIGN_IN_COPY.errors.wrongPathForCanonical);
    expect(message).not.toContain("Use an existing Passport to continue");
  });
});
