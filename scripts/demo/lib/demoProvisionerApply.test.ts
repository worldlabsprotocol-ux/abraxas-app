// FILE: scripts/demo/lib/demoProvisionerApply.test.ts

import { describe, expect, it } from "vitest";
import { shouldRefreshScreening } from "./demoProvisionerApply";
import { DEMO_SCREENING_REFRESH_WINDOW_HOURS } from "./demoProvisionerConfig";

describe("shouldRefreshScreening", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  it("refreshes when expired", () => {
    expect(shouldRefreshScreening("2026-06-01T11:00:00.000Z", now)).toBe(true);
    expect(shouldRefreshScreening(null, now)).toBe(true);
  });

  it("refreshes inside the 4-hour window", () => {
    const insideWindow = new Date(
      now.getTime() + (DEMO_SCREENING_REFRESH_WINDOW_HOURS - 0.5) * 60 * 60 * 1000,
    ).toISOString();
    expect(shouldRefreshScreening(insideWindow, now)).toBe(true);
  });

  it("does not refresh outside the window", () => {
    const outsideWindow = new Date(
      now.getTime() + (DEMO_SCREENING_REFRESH_WINDOW_HOURS + 1) * 60 * 60 * 1000,
    ).toISOString();
    expect(shouldRefreshScreening(outsideWindow, now)).toBe(false);
  });
});
