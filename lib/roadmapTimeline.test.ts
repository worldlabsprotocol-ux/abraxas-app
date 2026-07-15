import { describe, expect, it } from "vitest";
import { TIMELINE_FRAMINGS, TIMELINE_DISCLAIMER, getTimelineFraming } from "./roadmapTimeline";

describe("roadmapTimeline", () => {
  it("disclaims calendar dates", () => {
    expect(TIMELINE_DISCLAIMER.toLowerCase()).toContain("do not publish calendar dates");
  });

  it("provides conservative and confident framings", () => {
    expect(TIMELINE_FRAMINGS.map(f => f.id)).toEqual(["conservative", "confident"]);
    expect(TIMELINE_FRAMINGS[0]?.bullets.length).toBeGreaterThanOrEqual(4);
  });

  it("returns framing by variant", () => {
    expect(getTimelineFraming("confident").headline.toLowerCase()).toContain("passport");
  });
});
