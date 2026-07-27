import { describe, expect, it } from "vitest";
import { documentAspectScore, documentQualityScore } from "./documentSignals";

describe("documentSignals", () => {
  it("scores ID-1 aspect ratio highly", () => {
    const score = documentAspectScore(856, 540);
    expect(score).toBeGreaterThan(0.7);
  });

  it("scores portrait lower than landscape for same dimensions", () => {
    const portrait = documentAspectScore(540, 856);
    const landscape = documentAspectScore(856, 540);
    expect(portrait).toBeLessThan(landscape);
  });

  it("blends base quality with aspect intelligence", () => {
    const blended = documentQualityScore(0.8, 856, 540);
    expect(blended).toBeGreaterThan(0.75);
  });
});
