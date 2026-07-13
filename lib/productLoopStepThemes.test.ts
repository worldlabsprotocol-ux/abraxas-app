import { describe, expect, it } from "vitest";
import { PRODUCT_LOOP_STEP_THEMES, themeForStep } from "./productLoopStepThemes";

describe("productLoopStepThemes", () => {
  it("uses diagram mode for all steps", () => {
    for (const id of ["browse", "book", "signin", "consent", "verify"]) {
      expect(themeForStep(id).mode).toBe("diagram");
    }
  });

  it("assigns distinct accent colors per step", () => {
    const accents = new Set([
      PRODUCT_LOOP_STEP_THEMES.browse.accent,
      PRODUCT_LOOP_STEP_THEMES.book.accent,
      PRODUCT_LOOP_STEP_THEMES.signin.accent,
      PRODUCT_LOOP_STEP_THEMES.consent.accent,
    ]);
    expect(accents.size).toBeGreaterThanOrEqual(3);
  });
});
