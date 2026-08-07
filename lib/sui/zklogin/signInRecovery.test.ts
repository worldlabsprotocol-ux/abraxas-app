import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPassportRecoveryQuery,
  buildSignInRecoveryFromRegisterFailure,
  clearSignInRecovery,
  loadSignInRecovery,
  parseSignInRecoveryFromSearchParams,
  recoveryPrimaryActionHelper,
  recoveryPrimaryActionLabel,
  saveSignInRecovery,
  SIGN_IN_RECOVERY_STORAGE_KEY,
} from "./signInRecovery";
import { ZKLOGIN_SIGN_IN_COPY } from "./signInCopy";

describe("signInRecovery", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
      clear: () => { storage.clear(); },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists recovery state in sessionStorage until cleared", () => {
    const recovery = {
      message: ZKLOGIN_SIGN_IN_COPY.errors.wrongPathForCanonical,
      suggestedMode: "canonical" as const,
      createdAt: new Date().toISOString(),
    };

    saveSignInRecovery(recovery);
    expect(loadSignInRecovery()).toEqual(recovery);

    clearSignInRecovery();
    expect(loadSignInRecovery()).toBeNull();
    expect(storage.has(SIGN_IN_RECOVERY_STORAGE_KEY)).toBe(false);
  });

  it("parses recovery from passport query params", () => {
    const params = new URLSearchParams(
      buildPassportRecoveryQuery({
        message: "Try the recommended sign-in path.",
        suggestedMode: "canonical",
        createdAt: new Date().toISOString(),
      }),
    );

    expect(parseSignInRecoveryFromSearchParams(params)).toEqual({
      message: "Try the recommended sign-in path.",
      suggestedMode: "canonical",
      createdAt: expect.any(String),
    });
  });

  it("maps canonical mismatch recovery to Continue with Google CTA", () => {
    const recovery = buildSignInRecoveryFromRegisterFailure(
      409,
      {
        code: "zklogin_oauth_audience_mismatch",
        suggested_login_mode: "canonical",
        legacy_recovery_available: true,
      },
      "legacy_recovery",
      ZKLOGIN_SIGN_IN_COPY.errors.wrongPathForCanonical,
    );

    expect(recovery?.suggestedMode).toBe("canonical");
    expect(recoveryPrimaryActionLabel("canonical")).toBe("Continue with Google");
    expect(recoveryPrimaryActionHelper("canonical")).toBe("Recommended for most Passports.");
  });

  it("maps legacy mismatch recovery to legacy recovery CTA", () => {
    const recovery = buildSignInRecoveryFromRegisterFailure(
      409,
      {
        code: "zklogin_oauth_audience_mismatch",
        suggested_login_mode: "legacy_recovery",
        legacy_recovery_available: true,
      },
      "canonical",
      ZKLOGIN_SIGN_IN_COPY.errors.audienceMismatchDetail,
    );

    expect(recovery?.suggestedMode).toBe("legacy_recovery");
    expect(recoveryPrimaryActionLabel("legacy_recovery")).toBe(
      "Recover a Passport created with an older sign-in setup",
    );
    expect(recoveryPrimaryActionHelper("legacy_recovery")).toMatch(/only when Continue with Google/i);
  });

  it("clears persisted recovery on dismissal", () => {
    saveSignInRecovery({
      message: "Try again with the recommended path.",
      suggestedMode: "canonical",
      createdAt: new Date().toISOString(),
    });
    clearSignInRecovery();
    expect(loadSignInRecovery()).toBeNull();
  });

  it("parses message-only recovery without suggested mode", () => {
    const params = new URLSearchParams();
    params.set("sign_in_error", "Sign-in expired—please try again");
    expect(parseSignInRecoveryFromSearchParams(params)?.suggestedMode).toBeNull();
  });
});
