import { describe, expect, it } from "vitest";
import {
  ABRAXAS_HEADLINE,
  NORTH_STAR_PRINCIPLES,
  NORTH_STAR_PHASES,
  WORKFLOW_AFTER,
  WORKFLOW_BEFORE,
} from "./northStar";

describe("northStar", () => {
  it("defines ten principles and four phases", () => {
    expect(NORTH_STAR_PRINCIPLES).toHaveLength(10);
    expect(NORTH_STAR_PHASES.map(p => p.letter)).toEqual(["A", "B", "C", "D"]);
  });

  it("uses outcome-first headline", () => {
    expect(ABRAXAS_HEADLINE.toLowerCase()).toContain("stop repeating");
  });

  it("contrasts before/after workflows", () => {
    expect(WORKFLOW_BEFORE.length).toBeGreaterThan(WORKFLOW_AFTER.length);
    expect(WORKFLOW_AFTER[0]).toMatch(/verify once/i);
  });
});
