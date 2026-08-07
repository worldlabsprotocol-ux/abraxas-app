import { describe, expect, it } from "vitest";
import {
  collectZkLoginUserFacingCopy,
  FORBIDDEN_ZKLOGIN_USER_COPY_TERMS,
  ZKLOGIN_SIGN_IN_COPY,
} from "./signInCopy";

describe("ZKLOGIN_SIGN_IN_COPY", () => {
  it("uses the canonical Continue with Google button label", () => {
    expect(ZKLOGIN_SIGN_IN_COPY.canonicalButton).toBe("Continue with Google");
  });

  it("uses Passport-first helper and legacy button copy", () => {
    expect(ZKLOGIN_SIGN_IN_COPY.openButton).toBe("Sign in");
    expect(ZKLOGIN_SIGN_IN_COPY.chooserTitle).toBe("Access your Passport");
    expect(ZKLOGIN_SIGN_IN_COPY.legacySectionHeading).toBe("Older sign-in setup");
    expect(ZKLOGIN_SIGN_IN_COPY.canonicalHelper).toBe(
      "Recommended for most Passports.",
    );
    expect(ZKLOGIN_SIGN_IN_COPY.legacyButton).toBe(
      "Recover a Passport created with an older sign-in setup",
    );
    expect(ZKLOGIN_SIGN_IN_COPY.legacyHelper).toBe(
      "Use this only when Continue with Google does not open your Passport and you are directed here.",
    );
  });

  it("exposes accessible labels for both sign-in actions", () => {
    expect(ZKLOGIN_SIGN_IN_COPY.canonicalAriaLabel).toMatch(/Continue with Google/i);
    expect(ZKLOGIN_SIGN_IN_COPY.legacyAriaLabel).toMatch(/older sign-in setup/i);
  });

  it("keeps backend terms out of end-user copy", () => {
    const combined = collectZkLoginUserFacingCopy().join(" ").toLowerCase();
    for (const term of FORBIDDEN_ZKLOGIN_USER_COPY_TERMS) {
      expect(combined).not.toContain(term);
    }
  });
});
