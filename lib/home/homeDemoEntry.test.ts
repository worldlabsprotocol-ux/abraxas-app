import { describe, expect, it } from "vitest";
import {
  SIMPLIFIED_HOME_CTA_PRIMARY,
  SIMPLIFIED_HOME_CTA_PRIMARY_HREF,
  SIMPLIFIED_HERO_FLOW,
  SIMPLIFIED_HOME_EYEBROW,
} from "./simplifiedHomeCopy";

describe("homepage demo entry", () => {
  it("frames reusable private eligibility infrastructure above the fold", () => {
    expect(SIMPLIFIED_HOME_EYEBROW.toLowerCase()).toContain("reusable");
    expect(SIMPLIFIED_HOME_EYEBROW.toLowerCase()).toContain("eligibility");
    expect(SIMPLIFIED_HOME_CTA_PRIMARY).toBe("Try Abraxas");
    expect(SIMPLIFIED_HOME_CTA_PRIMARY_HREF).toBe("/try");
  });

  it("describes verify-once flow steps", () => {
    expect(SIMPLIFIED_HERO_FLOW[0]).toBe("Verify once");
    expect(SIMPLIFIED_HERO_FLOW).toContain("Establish reusable evidence");
    expect(SIMPLIFIED_HERO_FLOW).toContain("Receive a signed answer");
  });
});
