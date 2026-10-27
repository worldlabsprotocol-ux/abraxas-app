import { describe, expect, it } from "vitest";
import {
  auditPilotEconomicsReadiness,
  describeCostAttributionBuckets,
  emptyPilotEconomicsObservations,
} from "./costAttributionModel";

describe("Build 876 cost attribution", () => {
  it("separates baseline from marginal verification buckets", () => {
    const buckets = describeCostAttributionBuckets();
    const baseline = buckets.find((b) => b.id === "baseline_platform");
    const issuance = buckets.find((b) => b.id === "verification_issuance");
    expect(baseline?.marginalToVerification).toBe(false);
    expect(issuance?.marginalToVerification).toBe(true);
  });

  it("does not fabricate dollar amounts in default observations", () => {
    for (const row of emptyPilotEconomicsObservations()) {
      expect(row.amount_usd).toBeNull();
    }
  });

  it("warns against blended bill ÷ receipts as marginal cost", () => {
    const audit = auditPilotEconomicsReadiness();
    expect(audit.blendedCostWarning).toMatch(/blended/i);
    expect(audit.marginalCostGuidance).toMatch(/baseline/i);
  });
});
