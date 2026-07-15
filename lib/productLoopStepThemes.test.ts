import { describe, expect, it } from "vitest";
import { PRODUCT_LOOP_STEP_THEMES, themeForStep } from "./productLoopStepThemes";

describe("productLoopStepThemes", () => {
  it("uses diagram mode for all steps", () => {
    for (const id of ["spam", "pain", "verify-once", "global", "settle"]) {
      expect(themeForStep(id).mode).toBe("diagram");
    }
  });

  it("assigns distinct accent colors per step", () => {
    const accents = new Set([
      PRODUCT_LOOP_STEP_THEMES.spam.accent,
      PRODUCT_LOOP_STEP_THEMES.pain.accent,
      PRODUCT_LOOP_STEP_THEMES["verify-once"].accent,
      PRODUCT_LOOP_STEP_THEMES.global.accent,
    ]);
    expect(accents.size).toBeGreaterThanOrEqual(3);
  });
});
