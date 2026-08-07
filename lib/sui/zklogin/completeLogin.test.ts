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

const LEGACY_OAUTH_CLIENT_ID = "187000000000-legacyclient.apps.googleusercontent.com";
const NEW_OAUTH_CLIENT_ID = "540000000000-newclient.apps.googleusercontent.com";
const OAUTH_STATE = "signed-random-oauth-state-token";

const basePending = {
  ephemeralSecretKey: "ephemeral-secret-key",
  randomness: "randomness",
  maxEpoch: 110,
  provider: "google" as const,
  startedAt: new Date().toISOString(),
};

function mockVerifiedLoginFetch(
  loginMode: "canonical" | "legacy_recovery",
  registerResponse: Response | (() => Response),
) {
  vi.mocked(fetch).mockImplementation(async (url) => {
    const href = String(url);
    if (href.includes("/api/auth/zklogin/consume-login-state")) {
      return {
        ok: true,
        json: async () => ({ login_mode: loginMode }),
      } as Response;
    }
    if (href.includes("/api/auth/zklogin/register")) {
      return typeof registerResponse === "function" ? registerResponse() : registerResponse;
    }
    throw new Error(`Unexpected fetch: ${href}`);
  });
}

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

  it("fails safely when OAuth state verification fails", async () => {
    vi.mocked(loadPendingSession).mockReturnValue(basePending);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ code: "zklogin_sign_in_expired" }),
    } as Response);

    const token = fakeGoogleIdToken({ sub: "sub", aud: NEW_OAUTH_CLIENT_ID });
    await expect(
      completeGoogleZkLogin(token, { callbackHash: `#id_token=x&state=${OAUTH_STATE}` }),
    ).rejects.toThrow(ZKLOGIN_SIGN_IN_COPY.errors.signInExpired);
  });

  it("rejects login when OAuth client ID changed but server still returns legacy address", async () => {
    const oauthSub = "dgv-test-google-sub-12345";
    const userSalt = "982451653";
    const newToken = fakeGoogleIdToken({ sub: oauthSub, aud: NEW_OAUTH_CLIENT_ID });
    const legacyToken = fakeGoogleIdToken({ sub: oauthSub, aud: LEGACY_OAUTH_CLIENT_ID });
    const legacyAddress = jwtToAddress(legacyToken, userSalt);

    vi.mocked(loadPendingSession).mockReturnValue(basePending);
    mockVerifiedLoginFetch("canonical", {
      ok: true,
      json: async () => ({
        sui_address: legacyAddress,
        user_salt: userSalt,
        provider: "google",
        oauth_sub: oauthSub,
      }),
    } as Response);

    await expect(
      completeGoogleZkLogin(newToken, { callbackHash: `#state=${OAUTH_STATE}` }),
    ).rejects.toThrow(/could not verify your Passport/i);
  });

  it("completes legacy recovery using server-verified login_mode", async () => {
    const oauthSub = "dgv-test-google-sub-12345";
    const userSalt = "982451653";
    const legacyToken = fakeGoogleIdToken({ sub: oauthSub, aud: LEGACY_OAUTH_CLIENT_ID });
    const legacyAddress = jwtToAddress(legacyToken, userSalt);

    vi.mocked(loadPendingSession).mockReturnValue(basePending);
    mockVerifiedLoginFetch("legacy_recovery", {
      ok: true,
      json: async () => ({
        sui_address: legacyAddress,
        user_salt: userSalt,
        provider: "google",
        oauth_sub: oauthSub,
      }),
    } as Response);

    await completeGoogleZkLogin(legacyToken, { callbackHash: `#state=${OAUTH_STATE}` });

    const registerCall = vi.mocked(fetch).mock.calls.find(([url]) =>
      String(url).includes("/api/auth/zklogin/register"),
    );
    const body = JSON.parse(String((registerCall?.[1] as RequestInit).body)) as { login_mode?: string };
    expect(body.login_mode).toBe("legacy_recovery");
    expect(saveUserSession).toHaveBeenCalled();
  });

  it("completes canonical sign-in using server-verified login_mode", async () => {
    const oauthSub = "dgv-test-google-sub-12345";
    const userSalt = "982451653";
    const canonicalToken = fakeGoogleIdToken({ sub: oauthSub, aud: NEW_OAUTH_CLIENT_ID });
    const canonicalAddress = jwtToAddress(canonicalToken, userSalt);

    vi.mocked(loadPendingSession).mockReturnValue(basePending);
    mockVerifiedLoginFetch("canonical", {
      ok: true,
      json: async () => ({
        sui_address: canonicalAddress,
        user_salt: userSalt,
        provider: "google",
        oauth_sub: oauthSub,
      }),
    } as Response);

    await completeGoogleZkLogin(canonicalToken, { callbackHash: `#state=${OAUTH_STATE}` });

    const registerCall = vi.mocked(fetch).mock.calls.find(([url]) =>
      String(url).includes("/api/auth/zklogin/register"),
    );
    const body = JSON.parse(String((registerCall?.[1] as RequestInit).body)) as { login_mode?: string };
    expect(body.login_mode).toBe("canonical");
  });

  it("does not loop legacy recovery after audience mismatch — directs user to Continue with Google", async () => {
    const oauthSub = "dgv-test-google-sub-12345";
    const legacyToken = fakeGoogleIdToken({ sub: oauthSub, aud: LEGACY_OAUTH_CLIENT_ID });

    vi.mocked(loadPendingSession).mockReturnValue(basePending);
    mockVerifiedLoginFetch("legacy_recovery", {
      ok: false,
      status: 409,
      json: async () => ({
        code: "zklogin_oauth_audience_mismatch",
        legacy_recovery_available: true,
        suggested_login_mode: "canonical",
      }),
    } as Response);

    await expect(
      completeGoogleZkLogin(legacyToken, { callbackHash: `#state=${OAUTH_STATE}` }),
    ).rejects.toMatchObject({
      message: ZKLOGIN_SIGN_IN_COPY.errors.wrongPathForCanonical,
      suggestedMode: "canonical",
    });
  });

  it("directs canonical users with legacy passports to legacy recovery CTA", async () => {
    const oauthSub = "dgv-test-google-sub-12345";
    const canonicalToken = fakeGoogleIdToken({ sub: oauthSub, aud: NEW_OAUTH_CLIENT_ID });

    vi.mocked(loadPendingSession).mockReturnValue(basePending);
    mockVerifiedLoginFetch("canonical", {
      ok: false,
      status: 409,
      json: async () => ({
        code: "zklogin_oauth_audience_mismatch",
        legacy_recovery_available: true,
        suggested_login_mode: "legacy_recovery",
      }),
    } as Response);

    await expect(
      completeGoogleZkLogin(canonicalToken, { callbackHash: `#state=${OAUTH_STATE}` }),
    ).rejects.toMatchObject({
      message: ZKLOGIN_SIGN_IN_COPY.errors.audienceMismatchDetail,
      suggestedMode: "legacy_recovery",
    });
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
    expect(message).not.toMatch(/Use an existing Passport/i);
  });
});
