// FILE: lib/integrate/partnerJourney.test.ts

import { describe, expect, it } from "vitest";
import {
  INTEGRATOR_START_HERE_STEPS,
  INTEGRATOR_SANDBOX_BOUNDARY,
  PARTNER_FLOW_FIRST_TASKS,
} from "./partnerJourney";

describe("partnerJourney", () => {
  it("defines four ordered integrator steps", () => {
    expect(INTEGRATOR_START_HERE_STEPS).toHaveLength(4);
    expect(INTEGRATOR_START_HERE_STEPS[0].title.toLowerCase()).toContain("apply");
    expect(INTEGRATOR_START_HERE_STEPS[1].cta.href).toBe("/docs/partner-flow");
    expect(INTEGRATOR_START_HERE_STEPS[3].title.toLowerCase()).toContain("receipt");
  });

  it("does not imply self-serve production access", () => {
    const copy = [
      ...INTEGRATOR_START_HERE_STEPS.map((s) => s.body),
      INTEGRATOR_SANDBOX_BOUNDARY.productionDetail,
      ...PARTNER_FLOW_FIRST_TASKS,
    ].join(" ").toLowerCase();
    expect(copy).toContain("manual");
    expect(copy).not.toMatch(/\binstant\b.*\bproduction\b/);
  });
});
