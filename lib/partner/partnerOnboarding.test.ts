// FILE: lib/partner/partnerOnboarding.test.ts

import { describe, expect, it } from "vitest";
import { computeOnboardingProgress, slugifyPartnerId } from "@/lib/partner/partnerOnboarding";

describe("partnerOnboarding", () => {
  it("slugifies company names", () => {
    expect(slugifyPartnerId("Meridian Private Credit")).toBe("meridian-private-credit");
  });

  it("tracks sandbox progress", () => {
    const progress = computeOnboardingProgress({
      hasKey: true,
      keyPrefix: "abx_test_abc",
      calls30d: 3,
      approvedDecisions: 1,
    });
    expect(progress.completed).toBe(3);
    expect(progress.productionGateEligible).toBe(false);
  });

  it("marks production gate eligible on live approved verify", () => {
    const progress = computeOnboardingProgress({
      hasKey: true,
      keyPrefix: "abx_live_xyz",
      calls30d: 5,
      approvedDecisions: 2,
    });
    expect(progress.productionGateEligible).toBe(true);
    expect(progress.steps.find(s => s.id === "production_approved")?.done).toBe(true);
  });
});
