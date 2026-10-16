// FILE: lib/partner/build584/independentVerifierSteps.test.ts

import { describe, expect, it } from "vitest";
import { runInstitutionalIndependentVerifierMatrix } from "@/lib/partner/build584/independentVerifierSteps";

describe("independentVerifierSteps", () => {
  it("rejects wrong partner and wrong policy substitutions", () => {
    const steps = runInstitutionalIndependentVerifierMatrix({
      partnerId: "partner-a",
      policyId: "sandbox_institutional_protocol_access",
      policyVersion: 1,
    });
    expect(steps.find((s) => s.scenario === "approved")?.passed).toBe(true);
    expect(steps.find((s) => s.scenario === "wrong_partner")?.passed).toBe(true);
    expect(steps.find((s) => s.scenario === "wrong_policy")?.passed).toBe(true);
  });
});
