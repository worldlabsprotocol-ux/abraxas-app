// FILE: lib/goodTrouble/operationalActivationChecklist.test.ts

import { describe, expect, it } from "vitest";
import { buildOperationalActivationReport } from "@/lib/goodTrouble/operationalActivationChecklist";

describe("operationalActivationChecklist", () => {
  it("blocks production activation when policy version pin is stale", () => {
    const report = buildOperationalActivationReport({
      supabaseProjectRef: "bztwutzprwsdrtqdpymf",
      migration122Applied: true,
      activePolicyVersion: 2,
      activePolicyL0: true,
      launchpadAppExists: true,
      launchpadAppPolicyVersion: 1,
      launchpadEnvironment: "sandbox",
      productionActivated: false,
      productionApiKeyPresent: false,
      sandboxCredentialActive: true,
      callbackAllowlisted: true,
      callbackUrl: "https://www.goodtroublecanna.com/age-verification-result",
      policyId: "good-trouble-age_21_retail-v1",
      partnerHandoffFailClosed: true,
      sandboxReadinessReady: true,
      verifiedReceiptCount: 0,
    });

    const pin = report.checks.find((c) => c.id === "policy_version_pin");
    expect(pin?.status).toBe("BLOCKED");
    expect(report.ready_for_production_activation).toBe(false);
    expect(report.ready_for_sandbox_proof).toBe(true);
    expect(report.founder_actions.some((a) => a.includes("policy_version"))).toBe(true);
  });
});
