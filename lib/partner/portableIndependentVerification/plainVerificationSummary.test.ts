// FILE: lib/partner/portableIndependentVerification/plainVerificationSummary.test.ts

import { describe, expect, it } from "vitest";
import {
  runVerificationFirstDemoScenario,
  verificationFirstDemoManifest,
  VERIFICATION_FIRST_DEMO_SCENARIOS,
} from "./integrationFirstDemonstration";
import {
  buildDefaultResultRows,
  plainVerificationVerdict,
  VERIFICATION_FIRST_DEMO_PLAIN,
} from "./plainVerificationSummary";

describe("plainVerificationVerdict", () => {
  it.each(VERIFICATION_FIRST_DEMO_SCENARIOS)("labels scenario %s", (scenario) => {
    const { verification } = runVerificationFirstDemoScenario(scenario);
    const verdict = plainVerificationVerdict(verification, scenario);
    if (scenario === "valid") expect(verdict).toBe("Valid");
    if (scenario === "wrong_audience") expect(verdict).toBe("Wrong audience");
    if (scenario === "revoked") expect(verdict).toBe("Revoked");
    if (scenario === "tampered_signature") expect(verdict).toBe("Not valid");
    if (scenario === "stale_status") expect(verdict).toBe("Needs fresh status");
  });
});

describe("buildDefaultResultRows", () => {
  it("keeps fixture IDs out of the default summary and uses compact sections", () => {
    const m = verificationFirstDemoManifest();
    const { verification } = runVerificationFirstDemoScenario("valid");
    const built = buildDefaultResultRows({
      verification,
      mode: "hosted_demo_fixture",
      scenario: "valid",
      policy_id: m.policy_id,
      partner_id: m.partner_id,
      receipt_id: m.receipt_id,
      isSyntheticDemo: true,
      decisionResult: "approved",
    });
    const surface = [built.whatThisMeans, built.whatWasChecked, built.limitations, built.next].join("\n");
    expect(surface).not.toContain(m.policy_id);
    expect(surface).not.toContain(m.partner_id);
    expect(built.whatThisMeans).toContain("demonstration");
    expect(built.whatWasChecked).toMatch(/unchanged/i);
    expect(built.detailRows.length).toBeGreaterThan(5);
    expect(built.technicalIds).toContain(m.policy_id);
  });

  it("gives actionable next steps per verdict", () => {
    for (const scenario of VERIFICATION_FIRST_DEMO_SCENARIOS) {
      const { verification } = runVerificationFirstDemoScenario(scenario);
      const built = buildDefaultResultRows({
        verification,
        mode: "hosted_demo_fixture",
        scenario,
        policy_id: "p",
        partner_id: "partner",
        isSyntheticDemo: true,
      });
      expect(built.next.length).toBeGreaterThan(20);
      if (scenario === "revoked") expect(built.next.toLowerCase()).toContain("do not");
    }
  });

  it("mentions teaching limitations on demo valid", () => {
    const { verification } = runVerificationFirstDemoScenario("valid");
    const built = buildDefaultResultRows({
      verification,
      mode: "hosted_demo_fixture",
      scenario: "valid",
      policy_id: "p",
      partner_id: "x",
      isSyntheticDemo: true,
    });
    expect(built.limitations.toLowerCase()).toContain("teaching example");
    void VERIFICATION_FIRST_DEMO_PLAIN;
  });
});