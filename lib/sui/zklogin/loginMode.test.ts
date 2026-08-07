import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  inferLoginModeFromTokenAud,
  loginModeFromOAuthState,
  oauthStateForLoginMode,
  parseLoginModeFromCallbackHash,
  resolveLoginModeForRegister,
  suggestLoginModeAfterAudienceMismatch,
  ZKLOGIN_OAUTH_STATE,
} from "./loginMode";
import { fakeGoogleIdToken } from "./testJwt";

const CANONICAL = "540000000000-newclient.apps.googleusercontent.com";
const LEGACY = "187000000000-legacyclient.apps.googleusercontent.com";

const SUB = "test-google-sub";

describe("loginMode propagation", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID = CANONICAL;
    process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_LEGACY_CLIENT_ID = LEGACY;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("maps login modes to stable OAuth state values", () => {
    expect(oauthStateForLoginMode("canonical")).toBe(ZKLOGIN_OAUTH_STATE.canonical);
    expect(oauthStateForLoginMode("legacy_recovery")).toBe(ZKLOGIN_OAUTH_STATE.legacy_recovery);
    expect(loginModeFromOAuthState(ZKLOGIN_OAUTH_STATE.legacy_recovery)).toBe("legacy_recovery");
  });

  it("parses login mode from OAuth callback hash state", () => {
    const hash = `#id_token=abc&state=${ZKLOGIN_OAUTH_STATE.legacy_recovery}`;
    expect(parseLoginModeFromCallbackHash(hash)).toBe("legacy_recovery");
  });

  it("infers legacy recovery from JWT aud", () => {
    const token = fakeGoogleIdToken({ sub: SUB, aud: LEGACY });
    expect(inferLoginModeFromTokenAud(token)).toBe("legacy_recovery");
  });

  it("infers canonical from JWT aud", () => {
    const token = fakeGoogleIdToken({ sub: SUB, aud: CANONICAL });
    expect(inferLoginModeFromTokenAud(token)).toBe("canonical");
  });

  it("prefers pending loginMode over OAuth state and aud inference", () => {
    const token = fakeGoogleIdToken({ sub: SUB, aud: CANONICAL });
    const mode = resolveLoginModeForRegister({
      pending: {
        ephemeralSecretKey: "k",
        randomness: "r",
        maxEpoch: 1,
        provider: "google",
        loginMode: "legacy_recovery",
        startedAt: new Date().toISOString(),
      },
      idToken: token,
      callbackHash: `#state=${ZKLOGIN_OAUTH_STATE.canonical}`,
    });
    expect(mode).toBe("legacy_recovery");
  });

  it("recovers legacy mode from OAuth state when pending loginMode is absent", () => {
    const token = fakeGoogleIdToken({ sub: SUB, aud: LEGACY });
    const mode = resolveLoginModeForRegister({
      pending: {
        ephemeralSecretKey: "k",
        randomness: "r",
        maxEpoch: 1,
        provider: "google",
        startedAt: new Date().toISOString(),
      },
      idToken: token,
      callbackHash: `#id_token=x&state=${ZKLOGIN_OAUTH_STATE.legacy_recovery}`,
    });
    expect(mode).toBe("legacy_recovery");
  });

  it("infers mode from aud when pending omits loginMode", () => {
    const token = fakeGoogleIdToken({ sub: SUB, aud: LEGACY });
    const mode = resolveLoginModeForRegister({
      pending: {
        ephemeralSecretKey: "k",
        randomness: "r",
        maxEpoch: 1,
        provider: "google",
        startedAt: new Date().toISOString(),
      },
      idToken: token,
    });
    expect(mode).toBe("legacy_recovery");
  });

  it("suggests canonical after legacy recovery audience mismatch", () => {
    expect(suggestLoginModeAfterAudienceMismatch("legacy_recovery", true)).toBe("canonical");
    expect(suggestLoginModeAfterAudienceMismatch("legacy_recovery", false)).toBe("canonical");
  });

  it("suggests legacy recovery after canonical audience mismatch when available", () => {
    expect(suggestLoginModeAfterAudienceMismatch("canonical", true)).toBe("legacy_recovery");
    expect(suggestLoginModeAfterAudienceMismatch("canonical", false)).toBe("canonical");
  });
});
