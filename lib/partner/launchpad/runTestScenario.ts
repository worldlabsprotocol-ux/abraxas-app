// FILE: lib/partner/launchpad/runTestScenario.ts
// Sandbox test scenario runner for Partner Launchpad test console.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { resolveLaunchpadTestScenario } from "@/lib/partner/launchpad/testScenarios";
import { resolveLaunchpadPolicyTemplate } from "@/lib/partner/launchpad/policyCatalog";
import { validateLaunchpadHostedReturnUrl } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { SITE_URL } from "@/lib/siteUrl";

export interface LaunchpadTestRunResult {
  scenario_id: string;
  simulated: true;
  policy_template_id: string;
  policy_label: string;
  return_url: string;
  hosted_verify_url: string;
  public_code: string;
  receipt_verification_status: "simulated" | "not_applicable";
  timestamp: string;
  request_parameters: Record<string, string>;
}

export async function runLaunchpadTestScenario(input: {
  applicationId: string;
  partnerId: string;
  scenarioId: string;
  returnUrl?: string;
}): Promise<
  | { ok: true; result: LaunchpadTestRunResult }
  | { ok: false; code: string }
> {
  const scenario = resolveLaunchpadTestScenario(input.scenarioId);
  if (!scenario) return { ok: false, code: "invalid_scenario" };

  const app = await getLaunchpadApplicationForPartner(input.applicationId, input.partnerId);
  if (!app) return { ok: false, code: "not_found" };

  const returnUrl = input.returnUrl?.trim() || app.allowed_return_urls[0] || "";
  const template = resolveLaunchpadPolicyTemplate(app.policy_template_id);

  if (scenario.id === "invalid_return_url") {
    const sb = requireSupabaseAdmin();
    await recordLaunchpadActivity(sb, {
      applicationId: app.id,
      partnerId: input.partnerId,
      eventType: "verification_failed",
      publicCode: scenario.expectedPublicCode,
      metadata: { scenario: scenario.id, simulated: true },
    });
    return {
      ok: true,
      result: buildResult(app, scenario, returnUrl, "https://evil.example/callback", template?.label ?? app.policy_template_id),
    };
  }

  if (returnUrl && !validateLaunchpadHostedReturnUrl(app, returnUrl)) {
    return { ok: false, code: "return_url_rejected" };
  }

  const hostedVerifyUrl = `${SITE_URL}/partner/verify?app=${encodeURIComponent(app.public_slug)}&return_url=${encodeURIComponent(returnUrl)}`;

  const sb = requireSupabaseAdmin();
  await recordLaunchpadActivity(sb, {
    applicationId: app.id,
    partnerId: input.partnerId,
    eventType: scenario.id === "eligible" ? "receipt_issued" : "verification_failed",
    publicCode: scenario.expectedPublicCode,
    metadata: { scenario: scenario.id, simulated: true },
  });

  return {
    ok: true,
    result: buildResult(app, scenario, returnUrl, hostedVerifyUrl, template?.label ?? app.policy_template_id),
  };
}

function buildResult(
  app: { public_slug: string; policy_template_id: string },
  scenario: { id: string; expectedPublicCode: string },
  returnUrl: string,
  hostedVerifyUrl: string,
  policyLabel: string,
): LaunchpadTestRunResult {
  return {
    scenario_id: scenario.id,
    simulated: true,
    policy_template_id: app.policy_template_id,
    policy_label: policyLabel,
    return_url: returnUrl,
    hosted_verify_url: hostedVerifyUrl,
    public_code: scenario.expectedPublicCode,
    receipt_verification_status: scenario.id === "eligible" ? "simulated" : "not_applicable",
    timestamp: new Date().toISOString(),
    request_parameters: {
      app: app.public_slug,
      return_url: returnUrl,
      scenario: scenario.id,
    },
  };
}
