// FILE: lib/partner/build584/independentVerifierSteps.ts
// Local cryptographic regression (synthetic harness scenarios). Not live receipt verification.

import { runPartnerHarnessCase } from "@/lib/partner/launchpad/partnerTestHarness";
import { INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID } from "@/lib/partner/launchpad/institutionalActivationEntry";

export type IndependentVerifierStep = {
  scenario: string;
  passed: boolean;
  detail: string;
};

export function runInstitutionalIndependentVerifierMatrix(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
}): IndependentVerifierStep[] {
  const templateId = INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID;
  const scenarios = [
    { id: "approved", expectPass: true },
    { id: "wrong_partner", expectPass: true },
    { id: "wrong_policy", expectPass: true },
    { id: "replay", expectPass: true },
    { id: "revoked", expectPass: true },
  ] as const;

  return scenarios.map(({ id, expectPass }) => {
    const result = runPartnerHarnessCase({
      partnerId: input.partnerId,
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      policyTemplateId: templateId,
      scenarioId: id,
    });
    if ("ok" in result && result.ok === false) {
      return { scenario: id, passed: false, detail: result.code };
    }
    const caseResult = result as Exclude<typeof result, { ok: false }>;
    const passed = caseResult.passed === expectPass;
    return {
      scenario: id,
      passed,
      detail: `observed=${caseResult.observed_access} signature_valid=${caseResult.signature_valid}`,
    };
  });
}
