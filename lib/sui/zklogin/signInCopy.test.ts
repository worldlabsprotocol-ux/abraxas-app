import { describe, expect, it } from "vitest";
import {
  collectZkLoginUserFacingCopy,
  FORBIDDEN_ZKLOGIN_USER_COPY_TERMS,
  ZKLOGIN_SIGN_IN_COPY,
} from "./signInCopy";

describe("ZKLOGIN_SIGN_IN_COPY", () => {
  it("uses Abraxas-first primary sign-in label", () => {
    expect(ZKLOGIN_SIGN_IN_COPY.canonicalButton).toBe("Continue securely");
  });

  it("uses Passport-first helper and legacy button copy", () => {
    expect(ZKLOGIN_SIGN_IN_COPY.openButton).toBe("Sign in");
    expect(ZKLOGIN_SIGN_IN_COPY.chooserTitle).toBe("Connect to Abraxas");
    expect(ZKLOGIN_SIGN_IN_COPY.legacySectionHeading).toBe("Older sign in setup");
    expect(ZKLOGIN_SIGN_IN_COPY.canonicalHelper).toMatch(/Abraxas account/i);
    expect(ZKLOGIN_SIGN_IN_COPY.legacyButton).toBe(
      "Recover a Passport created with an older sign in setup",
    );
    expect(ZKLOGIN_SIGN_IN_COPY.legacyHelper).toMatch(/Continue securely/i);
  });

  it("exposes accessible labels for both sign-in actions", () => {
    expect(ZKLOGIN_SIGN_IN_COPY.canonicalAriaLabel).toMatch(/Continue securely/i);
    expect(ZKLOGIN_SIGN_IN_COPY.legacyAriaLabel).toMatch(/older sign in setup/i);
  });

  it("keeps backend terms out of end-user copy", () => {
    const combined = collectZkLoginUserFacingCopy().join(" ").toLowerCase();
    for (const term of FORBIDDEN_ZKLOGIN_USER_COPY_TERMS) {
      expect(combined).not.toContain(term);
    }
  });
});
