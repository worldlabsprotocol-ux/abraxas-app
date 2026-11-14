// FILE: lib/partner/portableIndependentVerification/plainVerificationSummary.test.ts

import { describe, expect, it } from "vitest";
import { runVerificationFirstDemoScenario } from "./integrationFirstDemonstration";
import { plainVerificationVerdict } from "./plainVerificationSummary";

describe("plainVerificationVerdict", () => {
  it("labels demo valid scenario as Valid", () => {
    const { verification } = runVerificationFirstDemoScenario("valid");
    expect(plainVerificationVerdict(verification, "valid")).toBe("Valid");
  });

  it("labels wrong audience scenario", () => {
    const { verification } = runVerificationFirstDemoScenario("wrong_audience");
    expect(plainVerificationVerdict(verification, "wrong_audience")).toBe("Wrong audience");
  });

  it("labels revoked scenario", () => {
    const { verification } = runVerificationFirstDemoScenario("revoked");
    expect(plainVerificationVerdict(verification, "revoked")).toBe("Revoked");
  });
});