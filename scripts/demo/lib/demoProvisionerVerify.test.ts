// FILE: scripts/demo/lib/demoProvisionerVerify.test.ts

import { describe, expect, it } from "vitest";
import { verifyExitCode, type ProvisionerVerifyReport } from "./demoProvisionerVerify";

function report(overrides: Partial<ProvisionerVerifyReport>): ProvisionerVerifyReport {
  return {
    mode: "verify",
    provisionId: "66666666-6666-4666-8666-666666666666",
    maskedSubjectId: "0xabc...def",
    credentialStatus: "active",
    policyDecision: "approved",
    missingClaims: [],
    screeningExpiresAt: "2026-12-01T00:00:00.000Z",
    screeningRemainingMs: 3 * 60 * 60 * 1000,
    rehearsalReady: true,
    recoveredStateWritten: false,
    ...overrides,
  };
}

describe("demoProvisionerVerify exit codes", () => {
  it("passes when rehearsal is ready and policy approves", () => {
    expect(verifyExitCode(report({}))).toBe(0);
  });

  it("fails when screening remaining is below rehearsal minimum", () => {
    expect(
      verifyExitCode(
        report({
          rehearsalReady: false,
          screeningRemainingMs: 30 * 60 * 1000,
        }),
      ),
    ).toBe(1);
  });

  it("fails when policy is not approved", () => {
    expect(
      verifyExitCode(
        report({
          policyDecision: "denied",
          rehearsalReady: false,
          missingClaims: ["screening_outcome"],
        }),
      ),
    ).toBe(1);
  });
});
