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
  it("keeps fixture policy and partner IDs out of default summary copy", () => {
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
    const body = built.rows.map((r) => r.value).join("\n");
    expect(body).not.toContain(m.policy_id);
    expect(body).not.toContain(m.partner_id);
    expect(built.rows[0]!.value).toContain(VERIFICATION_FIRST_DEMO_PLAIN.policySummary);
    expect(built.technicalIds).toContain(m.policy_id);
  });
});