import { describe, expect, it } from "vitest";
import {
  CONFIDENT_STATUS_FRAMING,
  CURRENT_STATUS_IN_PROGRESS,
  CURRENT_STATUS_LIVE,
  DEEP_DIVE_LINKS,
  HOMEPAGE_STATUS_LEAD,
  INTEGRATE_PRODUCTION_NOTE,
} from "./currentStatus";

describe("currentStatus", () => {
  it("frames integrate page for public beta", () => {
    expect(INTEGRATE_PRODUCTION_NOTE.toLowerCase()).toContain("public beta");
  });

  it("keeps homepage status lead honest about rollout", () => {
    expect(HOMEPAGE_STATUS_LEAD.toLowerCase()).toMatch(/live|pilot|beta/);
  });

  it("balances progress with remaining gates", () => {
    expect(CONFIDENT_STATUS_FRAMING.toLowerCase()).toContain("staged approach");
    expect(CONFIDENT_STATUS_FRAMING.toLowerCase()).toContain("live in production");
  });

  it("lists four in-progress items for partners", () => {
    expect(CURRENT_STATUS_IN_PROGRESS).toHaveLength(4);
    expect(CURRENT_STATUS_IN_PROGRESS.some(i => i.label.includes("monitoring"))).toBe(true);
  });

  it("shows live proof items", () => {
    expect(CURRENT_STATUS_LIVE.length).toBeGreaterThanOrEqual(2);
  });

  it("provides deep-dive navigation links", () => {
    expect(DEEP_DIVE_LINKS.some(l => l.href.includes("trust-framework"))).toBe(true);
    expect(DEEP_DIVE_LINKS.some(l => l.href.includes("roadmap"))).toBe(true);
  });
});
