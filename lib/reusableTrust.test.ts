// FILE: lib/reusableTrust.test.ts

import { describe, expect, it } from "vitest";
import { buildPilotMetricsFromPublic, computeOperatorRoi, PILOT_METRICS, TRUST_FLYWHEEL_STEPS } from "./reusableTrust";

describe("reusableTrust", () => {
  it("defines a closed trust flywheel loop", () => {
    expect(TRUST_FLYWHEEL_STEPS[0].label).toBe("Verify once");
    expect(TRUST_FLYWHEEL_STEPS.at(-1)?.label).toBe("More users verify once");
    expect(TRUST_FLYWHEEL_STEPS.length).toBeGreaterThanOrEqual(6);
  });

  it("computes operator ROI from inputs", () => {
    const roi = computeOperatorRoi({
      verificationsPerMonth: 500,
      minutesPerVerification: 12,
      hourlyLaborUsd: 30,
    });
    expect(roi.hoursBefore).toBe(100);
    expect(roi.hoursSaved).toBeGreaterThan(0);
    expect(roi.laborSavedUsd).toBeGreaterThan(0);
    expect(roi.documentsAvoided).toBeGreaterThan(0);
  });

  it("falls back to static pilot metrics without API", () => {
    expect(buildPilotMetricsFromPublic(null)).toEqual(PILOT_METRICS);
  });

  it("merges live Supabase counters when available", () => {
    const live = buildPilotMetricsFromPublic({
      ok: true,
      metrics: {
        attested_value_label: "$2.7M+ attested",
        zklogin_wallets: 42,
        cielo_revenue_usdc: 1200,
        captured_cielo_bookings: 3,
        verification_network: { total_presentations: 17, data_available: true },
      },
    });
    expect(live[0].value).toBe("17");
    expect(live[1].value).toBe("42");
    expect(live[2].value).toBe("$1,200");
    expect(live[3].pilot).toBe(false);
  });
});
