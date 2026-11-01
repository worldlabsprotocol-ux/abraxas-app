// FILE: lib/partner/launchpad/runTestScenario.ts
// Partner Launchpad test harness runner — real receipt trust evaluation.

import { launchpadUsesSovereignPostgres } from "@/lib/partner/launchpad/launchpadPersistence";
import {
  getLaunchpadApplicationForPartner,
  validateLaunchpadHostedReturnUrl,
} from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import {
  runPartnerHarnessCase,
  resolvePartnerHarnessScenario,
  type PartnerHarnessCaseResult,
} from "@/lib/partner/launchpad/partnerTestHarness";
import { SITE_URL } from "@/lib/siteUrl";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import { resolveIssuanceSigningKey } from "@/lib/decisionReceipts/verificationKeyLifecycle/resolve";

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
  // A durable receipt and its confirmation must resolve through the same
  // sovereign store. Do not issue a receipt on the legacy PostgREST path.
  if (!launchpadUsesSovereignPostgres()) return { ok: false, code: "receipt_unavailable" };

  const app = await getLaunchpadApplicationForPartner(input.applicationId, input.partnerId);
  if (!app) return { ok: false, code: "not_found" };

  const returnUrl = input.returnUrl?.trim() || app.allowed_return_urls[0] || "";
  if (returnUrl && !validateLaunchpadHostedReturnUrl(app, returnUrl)) {
    return { ok: false, code: "return_url_rejected" };
  }

  // Persisted harness receipts must be verifiable after this request and on
  // another server instance. An ephemeral test key cannot provide that.
  const signingKey = loadReceiptSigningKey();
  const authorizedKey = resolveIssuanceSigningKey({ schemaVersion: "1.0.0" });
  if (!signingKey || !authorizedKey.ok || authorizedKey.key_id !== signingKey.signingKeyId) {
    return { ok: false, code: "signing_unavailable" };
  }

  const caseResult = runPartnerHarnessCase({
    partnerId: app.partner_id,
    policyId: app.policy_id,
    policyVersion: app.policy_version,
    policyTemplateId: app.policy_template_id,
    scenarioId: scenario.id,
    signingKey,
    signingSource: "configured_issuer_key",
  });
  if ("ok" in caseResult && caseResult.ok === false) {
    return { ok: false, code: caseResult.code };
  }

  const result = caseResult as PartnerHarnessCaseResult;
  const hostedVerifyUrl = `${SITE_URL}/partner/verify?app=${encodeURIComponent(app.public_slug)}&return_url=${encodeURIComponent(returnUrl)}`;

  const { recordSovereignVerificationRun } = await import(
    "@/lib/partner/launchpad/sovereign/verificationExecution"
  );
  await recordSovereignVerificationRun({
    app,
    partnerId: input.partnerId,
    scenarioId: scenario.id,
    harness: result,
    idempotencyKey: `harness:${app.id}:${scenario.id}:${result.callback_params.receipt_id}`,
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

