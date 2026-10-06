// FILE: lib/partner/twoAppEvaluation/successCriteria.ts
// Ten success criteria — reuse must be observed, not inferred from config.

import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import type { TwoAppEvaluationRecord, TwoAppSuccessCriteriaResult } from "./contract";
import type { AppEvaluationChecklist } from "./contract";
import type { ReuseObservation } from "./contract";
import type { TwoAppReuseMetrics } from "./contract";
import { getEffectiveClassification, isExternalClassification } from "./classification";

export function evaluateSuccessCriteria(input: {
  record: TwoAppEvaluationRecord;
  app_a: AppEvaluationChecklist;
  app_b: AppEvaluationChecklist;
  reuse: ReuseObservation;
  metrics: TwoAppReuseMetrics;
}): TwoAppSuccessCriteriaResult {
  const pack = POLICY_PACKS[input.record.target_policy_pack as keyof typeof POLICY_PACKS];
  const effectiveClassification = getEffectiveClassification(input.record);
  const externalPartner = isExternalClassification(effectiveClassification);
  const twoApps = input.record.app_a.application_id !== input.record.app_b.application_id;
  const appAOk = input.app_a.server_verification_passed;
  const appBOk = input.app_b.server_verification_passed;
  const reuseAccepted = input.reuse.status === "accepted";
  const noSecondProvider =
    input.metrics.additional_raw_kyc_recollections != null
      ? input.metrics.additional_raw_kyc_recollections === 0
      : reuseAccepted && input.metrics.underlying_verification_events === 1
        ? true
        : null;
  const publicInterfaces = appAOk && appBOk;
  const privacyOk = Boolean(pack?.partner_does_not_receive?.length);

  const technicalSuccess =
    twoApps
    && appAOk
    && appBOk
    && reuseAccepted
    && noSecondProvider !== false
    && publicInterfaces
    && privacyOk;

  const result: TwoAppSuccessCriteriaResult = {
    external_partner_context: externalPartner,
    technical_success_met: technicalSuccess,
    two_distinct_applications: twoApps,
    app_a_server_verified: appAOk,
    app_b_server_verified: appBOk,
    reuse_accepted_observed: reuseAccepted,
    no_second_provider_verification_for_reuse: noSecondProvider,
    public_partner_interfaces_used: publicInterfaces,
    privacy_checks_pass: privacyOk,
    evidence_exportable: reuseAccepted && appAOk && appBOk,
    all_met: false,
  };

  result.all_met = result.technical_success_met;

  return result;
}
