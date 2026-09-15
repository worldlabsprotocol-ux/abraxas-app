// FILE: lib/goodTrouble/launchpadCaseStudy.test.ts

import { describe, expect, it } from "vitest";
import { GOOD_TROUBLE_CASE_STUDY } from "@/lib/goodTrouble/launchpadCaseStudy";

describe("Good Trouble launchpad case study", () => {
  it("frames external integration as case study not live claim", () => {
    expect(GOOD_TROUBLE_CASE_STUDY.title).toBe("INTEGRATION CASE STUDY");
    expect(GOOD_TROUBLE_CASE_STUDY.externalLive).toBe(false);
    expect(GOOD_TROUBLE_CASE_STUDY.ctaHref).toBe("/developers/launchpad");
    expect(GOOD_TROUBLE_CASE_STUDY.videoUrl).toContain("youtube.com/watch?v=GheS92n0i_M");
  });
});
