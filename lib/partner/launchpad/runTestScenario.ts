// FILE: lib/partner/launchpad/runTestScenario.ts
// Partner Launchpad test harness runner — real receipt trust evaluation.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { validateLaunchpadHostedReturnUrl } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import {
  runPartnerHarnessCase,
  resolvePartnerHarnessScenario,
  harnessPassPublicCode,
  type PartnerHarnessCaseResult,
} from "@/lib/partner/launchpad/partnerTestHarness";
import { SITE_URL } from "@/lib/siteUrl";

export type LaunchpadTestRunResult = PartnerHarnessCaseResult & {
  policy_template_id: string;
  policy_id: string;
  hosted_verify_url: string;
  return_url: string;
  timestamp: string;
};

export async function runLaunchpadTestScenario(input: {
  applicationId: string;
  partnerId: string;
  scenarioId: string;
  returnUrl?: string;
}): Promise<
  | { ok: true; result: LaunchpadTestRunResult }
  | { ok: false; code: string }
> {
  const scenario = resolvePartnerHarnessScenario(input.scenarioId);
  if (!scenario) return { ok: false, code: "invalid_scenario" };

  const app = await getLaunchpadApplicationForPartner(input.applicationId, input.partnerId);
  if (!app) return { ok: false, code: "not_found" };

  const returnUrl = input.returnUrl?.trim() || app.allowed_return_urls[0] || "";
  if (returnUrl && !validateLaunchpadHostedReturnUrl(app, returnUrl)) {
    return { ok: false, code: "return_url_rejected" };
  }

  const caseResult = runPartnerHarnessCase({
    partnerId: app.partner_id,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
    policyTemplateId: app.policy_template_id,
    scenarioId: scenario.id,
  });
  if ("ok" in caseResult && caseResult.ok === false) {
    return { ok: false, code: caseResult.code };
  }

  const result = caseResult as PartnerHarnessCaseResult;
  const hostedVerifyUrl = `${SITE_URL}/partner/verify?app=${encodeURIComponent(app.public_slug)}&return_url=${encodeURIComponent(returnUrl)}`;

  const sb = requireSupabaseAdmin();
  await recordLaunchpadActivity(sb, {
    applicationId: app.id,
    partnerId: input.partnerId,
    eventType: result.passed ? "receipt_verified" : "verification_failed",
    publicCode: result.passed ? harnessPassPublicCode(result.scenario_id) : `harness_${result.scenario_id}_fail`,
    metadata: {
      scenario: result.scenario_id,
      simulated: false,
      harness: true,
      passed: result.passed,
    },
  });

  return {
    ok: true,
    result: {
      ...result,
      policy_template_id: app.policy_template_id,
      policy_id: app.policy_id,
      hosted_verify_url: hostedVerifyUrl,
      return_url: returnUrl,
      timestamp: new Date().toISOString(),
    },
  };
}
