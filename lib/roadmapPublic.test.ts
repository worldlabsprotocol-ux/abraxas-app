import { describe, expect, it } from "vitest";
import {
  ROADMAP,
  ROADMAP_SECTIONS,
  ROADMAP_LONG_TERM_VISION,
  isCompletedRoadmapPhase,
} from "./roadmapPublic";

describe("roadmapPublic", () => {
  it("has three sections: completed, in progress, future", () => {
    expect(ROADMAP_SECTIONS.map(s => s.id)).toEqual(["completed", "in_progress", "future"]);
  });

  it("highlights shipped trust infrastructure in completed", () => {
    const completed = ROADMAP_SECTIONS[0]!.items.join(" ");
    expect(completed).toContain("Trust Engine");
    expect(completed).toContain("Trust Decision API");
    expect(completed).toContain("P0 complete");
  });

  it("puts IAT and P1 in progress, not completed", () => {
    const inProgress = ROADMAP_SECTIONS[1]!.items.join(" ");
    expect(inProgress).toContain("Institutional Acceptance Test");
    expect(inProgress).toContain("Immutable policy versions");
  });

  it("keeps speculative items in long-term vision, not future milestones", () => {
    const futureItems = ROADMAP_SECTIONS[2]!.items.join(" ");
    expect(futureItems).not.toContain("DAO");
    expect(ROADMAP_LONG_TERM_VISION.items.join(" ")).toContain("DAO");
  });

  it("exports legacy ROADMAP shape for MilestonesSection", () => {
    expect(ROADMAP).toHaveLength(3);
    expect(ROADMAP[0]?.phase).toBe("Completed");
  });

  it("identifies completed phase for checkmarks", () => {
    expect(isCompletedRoadmapPhase("Completed")).toBe(true);
    expect(isCompletedRoadmapPhase("In progress")).toBe(false);
  });
});
