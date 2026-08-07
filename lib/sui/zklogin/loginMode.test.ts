import { describe, expect, it } from "vitest";
import { suggestLoginModeAfterAudienceMismatch } from "./loginMode";

describe("loginMode helpers", () => {
  it("suggests canonical after legacy recovery audience mismatch", () => {
    expect(suggestLoginModeAfterAudienceMismatch("legacy_recovery", true)).toBe("canonical");
    expect(suggestLoginModeAfterAudienceMismatch("legacy_recovery", false)).toBe("canonical");
  });

  it("suggests legacy recovery after canonical audience mismatch when available", () => {
    expect(suggestLoginModeAfterAudienceMismatch("canonical", true)).toBe("legacy_recovery");
    expect(suggestLoginModeAfterAudienceMismatch("canonical", false)).toBe("canonical");
  });
});
