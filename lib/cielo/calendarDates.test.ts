// FILE: lib/cielo/calendarDates.test.ts

import { describe, expect, it } from "vitest";
import { buildCalendarGrid, localDateIso } from "./calendarDates";

describe("localDateIso", () => {
  it("returns local YYYY-MM-DD without UTC drift", () => {
    const d = new Date(2026, 6, 13, 23, 30, 0);
    expect(localDateIso(d)).toBe("2026-07-13");
  });
});

describe("buildCalendarGrid", () => {
  it("includes day numbers for in-range cells", () => {
    const start = new Date(2026, 6, 13, 12, 0, 0);
    const grid = buildCalendarGrid(14, start);
    const numbered = grid.cells.filter(c => c.dayOfMonth != null);
    expect(numbered.length).toBe(14);
    expect(numbered[0]?.dayOfMonth).toBe(13);
  });
});
