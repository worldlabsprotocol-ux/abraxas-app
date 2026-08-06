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
    expect(ZKLOGIN_SIGN_IN_COPY.legacySectionHeading).toBe("Already have a Passport?");
    expect(ZKLOGIN_SIGN_IN_COPY.canonicalHelper).toBe(
      "New to Abraxas? This creates your Passport.",
    );
    expect(ZKLOGIN_SIGN_IN_COPY.legacyButton).toBe("Use an existing Passport");
    expect(ZKLOGIN_SIGN_IN_COPY.legacyHelper).toBe(
      "Had an Abraxas Passport before our sign-in update? Continue here.",
    );
  });

  it("exposes accessible labels for both sign-in actions", () => {
    expect(ZKLOGIN_SIGN_IN_COPY.canonicalAriaLabel).toMatch(/Continue with Google/i);
    expect(ZKLOGIN_SIGN_IN_COPY.legacyAriaLabel).toMatch(/existing Passport/i);
  });

  it("keeps backend terms out of end-user copy", () => {
    const combined = collectZkLoginUserFacingCopy().join(" ").toLowerCase();
    for (const term of FORBIDDEN_ZKLOGIN_USER_COPY_TERMS) {
      expect(combined).not.toContain(term);
    }
  });
});
