// FILE: lib/eliteDemoSlides.test.ts

import { describe, expect, it } from "vitest";
import {
  ELITE_DEMO_BY_ID,
  HERO_ELITE_DEMO,
  BUILD_ELITE_DEMO,
  AGENTIC_ELITE_DEMO,
} from "./eliteDemoSlides";

describe("eliteDemoSlides", () => {
  it("defines hero demo with three slides", () => {
    expect(HERO_ELITE_DEMO.slides).toHaveLength(3);
    expect(HERO_ELITE_DEMO.aspect).toBe("cinema");
  });

  it("registers all demo configs", () => {
    expect(Object.keys(ELITE_DEMO_BY_ID).length).toBeGreaterThanOrEqual(8);
  });

  it("uses minimal headlines", () => {
    for (const slide of BUILD_ELITE_DEMO.slides) {
      expect(slide.headline.length).toBeLessThan(40);
    }
  });

  it("agentic demo covers verify and act", () => {
    expect(AGENTIC_ELITE_DEMO.slides.map(s => s.id)).toContain("robinhood");
    expect(AGENTIC_ELITE_DEMO.slides.map(s => s.id)).toContain("verify");
  });
});
