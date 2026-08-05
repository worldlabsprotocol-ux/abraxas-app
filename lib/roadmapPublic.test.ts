import { describe, expect, it } from "vitest";
import {
  ROADMAP,
  ROADMAP_SECTIONS,
  ROADMAP_LONG_TERM_VISION,
  isCompletedRoadmapPhase,
} from "./roadmapPublic";

describe("roadmapPublic", () => {
  it("has four evidence-based sections", () => {
    expect(ROADMAP_SECTIONS.map(s => s.id)).toEqual(["live", "beta_ready", "blocked", "later"]);
  });

  it("highlights Partner Flow and P1 work in live section", () => {
    const live = ROADMAP_SECTIONS.find(s => s.id === "live")!.items.join(" ");
    expect(live).toContain("Partner Flow");
    expect(live).toContain("P1-2");
    expect(live).toContain("P1-3");
  });

  it("keeps IAT and beta tag in blocked, not live", () => {
    const blocked = ROADMAP_SECTIONS.find(s => s.id === "blocked")!.items.join(" ");
    expect(blocked).toContain("IAT");
    expect(blocked).toContain("v1.0.0-beta.0");
    expect(blocked).toContain("NOT");
  });

  it("puts Good Trouble pilot evidence in beta_ready", () => {
    const beta = ROADMAP_SECTIONS.find(s => s.id === "beta_ready")!.items.join(" ");
    expect(beta.toLowerCase()).toContain("good trouble");
    expect(beta.toLowerCase()).toContain("pilot");
  });

  it("keeps speculative items in long-term vision, not later milestones", () => {
    const laterItems = ROADMAP_SECTIONS.find(s => s.id === "later")!.items.join(" ");
    expect(laterItems).not.toContain("DAO");
    expect(ROADMAP_LONG_TERM_VISION.items.join(" ")).toContain("DAO");
  });

  it("exports legacy ROADMAP shape for MilestonesSection", () => {
    expect(ROADMAP).toHaveLength(4);
    expect(ROADMAP[0]?.phase).toBe("Live today");
  });

  it("identifies live phase for checkmarks", () => {
    expect(isCompletedRoadmapPhase("Live today")).toBe(true);
    expect(isCompletedRoadmapPhase("Beta-ready — pending human evidence")).toBe(false);
  });
});
