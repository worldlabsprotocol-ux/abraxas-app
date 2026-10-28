import { describe, expect, it } from "vitest";
import { summarizeIndependentEnforcement } from "@/lib/developers/independentEnforcementSummary";
import type { IndependentVerificationResult } from "@abraxas/independent-verifier";

function baseResult(
  overrides: Partial<IndependentVerificationResult>,
): IndependentVerificationResult {
  return {
    contract_version: "abraxas_independent_verifier/1.1.0",
    cryptographically_authentic: true,
    issuer_currently_authorized: true,
    policy_and_audience_match: true,
    status_evidence_authentic: true,
    currently_acceptable: "yes",
    phases: [],
    failure_codes: [],
    disclaimer: "test",
    ...overrides,
  };
}

describe("summarizeIndependentEnforcement", () => {
  it("maps acceptable verification to permit copy", () => {
    const summary = summarizeIndependentEnforcement(baseResult({ currently_acceptable: "yes" }));
    expect(summary.action).toBe("permit");
    expect(summary.headline).toMatch(/permit/i);
  });

  it("maps unacceptable verification to deny copy", () => {
    const summary = summarizeIndependentEnforcement(
      baseResult({ currently_acceptable: "no", failure_codes: ["expired"] }),
    );
    expect(summary.action).toBe("deny");
  });

  it("maps indeterminate verification", () => {
    const summary = summarizeIndependentEnforcement(
      baseResult({ currently_acceptable: "indeterminate", cryptographically_authentic: false }),
    );
    expect(summary.action).toBe("indeterminate");
  });
});
