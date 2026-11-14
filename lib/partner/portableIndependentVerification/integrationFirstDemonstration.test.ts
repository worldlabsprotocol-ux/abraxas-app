// FILE: lib/partner/portableIndependentVerification/integrationFirstDemonstration.test.ts

import { describe, expect, it } from "vitest";
import {
  runVerificationFirstDemoScenario,
  verificationFirstDemoManifest,
  VERIFICATION_FIRST_DEMO_SCENARIOS,
} from "./integrationFirstDemonstration";

describe("verification-first adoption demonstration (Build #821 fixtures)", () => {
  it("exposes synthetic non-production manifest", () => {
    const m = verificationFirstDemoManifest();
    expect(m.not_for_production).toBe(true);
    expect(m.partner_id).toBe("partner-integration-821");
  });

  it.each(VERIFICATION_FIRST_DEMO_SCENARIOS)("runs scenario %s", (scenario) => {
    const out = runVerificationFirstDemoScenario(scenario);
    expect(out.scenario).toBe(scenario);
    expect(out.verification.contract_version).toMatch(/independent_verifier/);
    if (scenario === "valid") {
      expect(out.verification.currently_acceptable).toBe("yes");
      expect(out.verification.cryptographically_authentic).toBe(true);
    }
    if (scenario === "wrong_audience") {
      expect(out.verification.currently_acceptable).not.toBe("yes");
    }
    if (scenario === "revoked") {
      expect(out.verification.currently_acceptable).not.toBe("yes");
    }
  });
});