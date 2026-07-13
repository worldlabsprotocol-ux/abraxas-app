// FILE: lib/reusableTrust.test.ts

import { describe, expect, it } from "vitest";
import { computeOperatorRoi, TRUST_FLYWHEEL_STEPS } from "./reusableTrust";

describe("reusableTrust", () => {
  it("defines a closed trust flywheel loop", () => {
    expect(TRUST_FLYWHEEL_STEPS[0].label).toBe("Verify once");
    expect(TRUST_FLYWHEEL_STEPS.at(-1)?.label).toBe("More users verify once");
    expect(TRUST_FLYWHEEL_STEPS.length).toBeGreaterThanOrEqual(6);
  });

  it("computes operator ROI from inputs", () => {
    const roi = computeOperatorRoi({
      verificationsPerMonth: 500,
      minutesPerVerification: 12,
      hourlyLaborUsd: 30,
    });
    expect(roi.hoursBefore).toBe(100);
    expect(roi.hoursSaved).toBeGreaterThan(0);
    expect(roi.laborSavedUsd).toBeGreaterThan(0);
    expect(roi.documentsAvoided).toBeGreaterThan(0);
  });
});
