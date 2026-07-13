import { describe, expect, it } from "vitest";
import { PRODUCT_LOOP_STEPS } from "./productLoopSteps";

describe("productLoopSteps", () => {
  it("defines five closed-loop steps with real hrefs", () => {
    expect(PRODUCT_LOOP_STEPS).toHaveLength(5);
    expect(PRODUCT_LOOP_STEPS.map(s => s.id)).toEqual([
      "spam",
      "pain",
      "verify-once",
      "global",
      "settle",
    ]);
    for (const step of PRODUCT_LOOP_STEPS) {
      expect(step.href).toMatch(/^\//);
      expect(step.ctaLabel.length).toBeGreaterThan(0);
    }
  });

  it("links re-verify pain to Abraxas acquire flow", () => {
    expect(PRODUCT_LOOP_STEPS.find(s => s.id === "spam")?.title).toContain("re-verify");
    expect(PRODUCT_LOOP_STEPS.find(s => s.id === "settle")?.href).toBe("/case-studies/chickasaw-project#acquire");
    expect(PRODUCT_LOOP_STEPS.find(s => s.id === "settle")?.metrics?.some(m => m.value.includes("USDC"))).toBe(true);
  });
});
