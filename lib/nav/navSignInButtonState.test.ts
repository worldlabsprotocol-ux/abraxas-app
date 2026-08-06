import { describe, expect, it } from "vitest";
import {
  NAV_SIGN_IN_COPY,
  resolveNavSignInUiState,
} from "./navSignInButtonState";

describe("resolveNavSignInUiState", () => {
  it("returns unavailable when canonical zkLogin is not configured", () => {
    expect(
      resolveNavSignInUiState({ configured: false, legacyRecoveryConfigured: false }),
    ).toBe("unavailable");
    expect(
      resolveNavSignInUiState({ configured: false, legacyRecoveryConfigured: true }),
    ).toBe("unavailable");
  });

  it("returns canonical_only when only canonical sign-in is configured", () => {
    expect(
      resolveNavSignInUiState({ configured: true, legacyRecoveryConfigured: false }),
    ).toBe("canonical_only");
  });

  it("returns canonical_and_legacy when aligned legacy recovery is browser-configured", () => {
    expect(
      resolveNavSignInUiState({ configured: true, legacyRecoveryConfigured: true }),
    ).toBe("canonical_and_legacy");
  });

  it("uses honest unavailable copy", () => {
    expect(NAV_SIGN_IN_COPY.unavailable).toBe("Sign-in unavailable");
    expect(NAV_SIGN_IN_COPY.unavailableHint).toMatch(/not configured/i);
  });

  it("uses shared zkLogin button and aria labels", () => {
    expect(NAV_SIGN_IN_COPY.open).toBe("Sign in");
    expect(NAV_SIGN_IN_COPY.canonical).toBe("Continue with Google");
    expect(NAV_SIGN_IN_COPY.legacy).toBe("Use an existing Passport");
    expect(NAV_SIGN_IN_COPY.canonicalAriaLabel).toMatch(/Passport/i);
    expect(NAV_SIGN_IN_COPY.legacyAriaLabel).toMatch(/existing Passport/i);
  });
});
