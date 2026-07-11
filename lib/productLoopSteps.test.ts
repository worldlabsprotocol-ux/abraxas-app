import { describe, expect, it } from "vitest";
import { PRODUCT_LOOP_STEPS } from "./productLoopSteps";

describe("productLoopSteps", () => {
  it("defines five pilot steps with real hrefs", () => {
    expect(PRODUCT_LOOP_STEPS).toHaveLength(5);
    expect(PRODUCT_LOOP_STEPS.map(s => s.id)).toEqual([
      "browse",
      "book",
      "signin",
      "consent",
      "verify",
    ]);
    for (const step of PRODUCT_LOOP_STEPS) {
      expect(step.href).toMatch(/^\//);
      expect(step.ctaLabel.length).toBeGreaterThan(0);
    }
  });

  it("links Cielo pilot and registry verify", () => {
    expect(PRODUCT_LOOP_STEPS.find(s => s.id === "book")?.href).toBe("/cielo/verified-rate");
    expect(PRODUCT_LOOP_STEPS.find(s => s.id === "book")?.title).toContain("USDC");
    expect(PRODUCT_LOOP_STEPS.find(s => s.id === "verify")?.href).toBe("/verify/ABX-RE-HOSP-001");
  });
});
