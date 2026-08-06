import { describe, expect, it } from "vitest";
import {
  canOpenSignInChooser,
  shouldShowLegacySignInOption,
} from "./signInChooserState";

describe("signInChooserState", () => {
  it("shows legacy option only when aligned legacy recovery is browser-configured", () => {
    expect(
      shouldShowLegacySignInOption({ configured: true, legacyRecoveryConfigured: true }),
    ).toBe(true);
    expect(
      shouldShowLegacySignInOption({ configured: true, legacyRecoveryConfigured: false }),
    ).toBe(false);
    expect(
      shouldShowLegacySignInOption({ configured: false, legacyRecoveryConfigured: true }),
    ).toBe(false);
  });

  it("allows opening the chooser only when canonical zkLogin is configured", () => {
    expect(canOpenSignInChooser({ configured: true })).toBe(true);
    expect(canOpenSignInChooser({ configured: false })).toBe(false);
  });
});
