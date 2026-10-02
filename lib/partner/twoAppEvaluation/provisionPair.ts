// FILE: lib/partner/twoAppEvaluation/provisionPair.ts
// Guided two-app sandbox provisioning — reuses launchpad atomic provision.

import { provisionLaunchpadSandbox } from "@/lib/partner/launchpad/provisionSandbox";
import { SITE_URL } from "@/lib/siteUrl";
import type { TwoAppEvaluationRecord } from "./contract";
import { TWO_APP_DEFAULT_POLICY_PACK } from "./contract";
import { createEvaluationId, saveTwoAppEvaluationRecord } from "./store";
import { inferEvidenceClassification } from "./classification";

export type ProvisionTwoAppPairInput = {
  partnerId: string;
  appADisplayName?: string;
  appBDisplayName?: string;
  returnUrl?: string;
  targetPolicyPack?: string;
  discoveryCompletedAt?: string | null;
  operatorClassificationOverride?: TwoAppEvaluationRecord["operator_classification_override"];
};

export type ProvisionTwoAppPairResult =
  | {
      ok: true;
      record: TwoAppEvaluationRecord;
      api_keys: { app_a: string | null; app_b: string | null };
    }
  | { ok: false; code: string };

export async function provisionTwoAppSandboxPair(
  input: ProvisionTwoAppPairInput,
): Promise<ProvisionTwoAppPairResult> {
  const partnerId = input.partnerId.trim();
  const policyPack = input.targetPolicyPack ?? TWO_APP_DEFAULT_POLICY_PACK;
  const returnUrl = input.returnUrl?.trim() || `${SITE_URL}/evaluation/two-app/callback`;
  const evaluationId = createEvaluationId();
  const suffix = evaluationId.slice(0, 8);

  const appAName = (input.appADisplayName ?? "Evaluation App A").trim();
  const appBName = (input.appBDisplayName ?? "Evaluation App B").trim();

  const appA = await provisionLaunchpadSandbox({
    applicationName: `eval-a-${suffix}`,
    displayName: appAName,
    partnerId,
    policyTemplateId: policyPack,
    returnUrl,
    idempotencyKey: `two-app-eval-a-${evaluationId}`,
  });

  if (!appA.ok) return { ok: false, code: appA.code };

  const appB = await provisionLaunchpadSandbox({
    applicationName: `eval-b-${suffix}`,
    displayName: appBName,
    partnerId,
    policyTemplateId: policyPack,
    returnUrl,
    idempotencyKey: `two-app-eval-b-${evaluationId}`,
  });

  if (!appB.ok) return { ok: false, code: appB.code };

  const classification = inferEvidenceClassification({
    partnerId,
    operatorOverride: input.operatorClassificationOverride ?? null,
  });

  const record: TwoAppEvaluationRecord = {
    evaluation_id: evaluationId,
    partner_id: partnerId,
    environment: "sandbox",
    started_at: new Date().toISOString(),
    target_policy_pack: policyPack,
    app_a: {
      application_id: appA.result.application_id,
      display_name: appAName,
    },
    app_b: {
      application_id: appB.result.application_id,
      display_name: appBName,
    },
    evidence_classification: classification,
    operator_classification_override: input.operatorClassificationOverride ?? null,
    discovery_completed_at: input.discoveryCompletedAt ?? null,
    blocked_category: null,
    blocked_note: null,
  };

  await saveTwoAppEvaluationRecord(record);

  return {
    ok: true,
    record,
    api_keys: {
      app_a: appA.idempotencyReplay ? null : appA.apiKey ?? null,
      app_b: appB.idempotencyReplay ? null : appB.apiKey ?? null,
    },
  };
}
