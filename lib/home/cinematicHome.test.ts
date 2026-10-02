// FILE: lib/home/cinematicHome.test.ts
import { describe, expect, it } from "vitest";
import {
  CINEMATIC_THESIS_LINE_1,
  CINEMATIC_THESIS_LINE_2,
  PRODUCT_PROOF_FOOTNOTE,
  REUSE_ORBIT_DISCLAIMER,
  SYNTHETIC_IDENTITY_FIELDS,
} from "./cinematicHomeCopy";

describe("cinematic home copy", () => {
  it("uses thesis lines without unsupported claims", () => {
    expect(CINEMATIC_THESIS_LINE_1).toBe("VERIFY WHAT MATTERS.");
    expect(CINEMATIC_THESIS_LINE_2).toBe("REVEAL NOTHING ELSE.");
  });

  it("uses synthetic identity fields only", () => {
    expect(SYNTHETIC_IDENTITY_FIELDS).not.toContain("SSN");
    expect(SYNTHETIC_IDENTITY_FIELDS.length).toBeGreaterThan(3);
  });

  it("labels conceptual reuse and product proof boundaries", () => {
    expect(REUSE_ORBIT_DISCLAIMER.toLowerCase()).toContain("conceptual");
    expect(PRODUCT_PROOF_FOOTNOTE.toLowerCase()).toContain("birth date");
  });
});
