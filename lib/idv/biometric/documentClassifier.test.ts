// FILE: lib/idv/biometric/documentClassifier.test.ts

import { describe, expect, it } from "vitest";
import { documentAspectScore } from "./documentSignals";

describe("documentClassifier", () => {
  it("scores ID-1 card aspect highly", () => {
    expect(documentAspectScore(856, 540)).toBeGreaterThan(0.7);
  });

  it("scores portrait random photo low", () => {
    expect(documentAspectScore(1080, 1920)).toBeLessThan(0.35);
  });

  it("scores square image low", () => {
    expect(documentAspectScore(1000, 1000)).toBeLessThan(0.5);
  });
});
