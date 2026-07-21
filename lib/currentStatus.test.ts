import { describe, expect, it } from "vitest";
import {
  CONFIDENT_STATUS_FRAMING,
  CURRENT_STATUS_IN_PROGRESS,
  CURRENT_STATUS_LIVE,
  DEEP_DIVE_LINKS,
  HOMEPAGE_STATUS_LEAD,
} from "./currentStatus";

describe("currentStatus", () => {
  it("leads homepage with live production proof", () => {
    expect(HOMEPAGE_STATUS_LEAD.toLowerCase()).toContain("live in production");
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
