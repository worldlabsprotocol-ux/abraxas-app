import { describe, expect, it } from "vitest";
import {
  canOpenSignInChooser,
  shouldShowLegacySignInOption,
  shouldShowLegacySignInOptionOnAdvanced,
} from "./signInChooserState";

describe("signInChooserState", () => {
  it("hides legacy recovery on customer sign-in surfaces", () => {
    expect(
      shouldShowLegacySignInOption({ configured: true, legacyRecoveryConfigured: true }),
    ).toBe(false);
    expect(
      shouldShowLegacySignInOption({ configured: true, legacyRecoveryConfigured: false }),
    ).toBe(false);
  });

  it("shows legacy option on advanced surfaces when browser-configured", () => {
    expect(
      shouldShowLegacySignInOptionOnAdvanced({ configured: true, legacyRecoveryConfigured: true }),
    ).toBe(true);
    expect(
      shouldShowLegacySignInOptionOnAdvanced({ configured: true, legacyRecoveryConfigured: false }),
    ).toBe(false);
  });

  it("allows opening the chooser only when canonical zkLogin is configured", () => {
    expect(canOpenSignInChooser({ configured: true })).toBe(true);
    expect(canOpenSignInChooser({ configured: false })).toBe(false);
  });
});
