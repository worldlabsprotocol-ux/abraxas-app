import { describe, expect, it } from "vitest";
import { shouldRestoreStudioPolicySelection } from "./policySelection";

describe("Integration Studio policy draft restoration", () => {
  it("does not restore the legacy implicit wallet default in the beginner flow", () => {
    expect(shouldRestoreStudioPolicySelection({
      packId: "wallet_control",
      beginnerSurface: true,
      selectionRecorded: false,
      explicitIntent: false,
    })).toBe(false);
  });

  it("preserves explicit choices and valid selections outside the beginner flow", () => {
    expect(shouldRestoreStudioPolicySelection({
      packId: "wallet_control",
      beginnerSurface: true,
      selectionRecorded: true,
      explicitIntent: false,
    })).toBe(true);
    expect(shouldRestoreStudioPolicySelection({
      packId: "wallet_control",
      beginnerSurface: true,
      selectionRecorded: false,
      explicitIntent: true,
    })).toBe(true);
    expect(shouldRestoreStudioPolicySelection({
      packId: "age_21_retail",
      beginnerSurface: true,
      selectionRecorded: false,
      explicitIntent: false,
    })).toBe(true);
    expect(shouldRestoreStudioPolicySelection({
      packId: "wallet_control",
      beginnerSurface: false,
      selectionRecorded: false,
      explicitIntent: false,
    })).toBe(true);
  });
});
