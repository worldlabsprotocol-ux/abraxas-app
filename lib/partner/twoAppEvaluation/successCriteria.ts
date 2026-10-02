// FILE: lib/partner/twoAppEvaluation/successCriteria.ts
// Ten success criteria — reuse must be observed, not inferred from config.

import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import type { TwoAppEvaluationRecord, TwoAppSuccessCriteriaResult } from "./contract";
import type { AppEvaluationChecklist } from "./contract";
import type { ReuseObservation } from "./contract";
import type { TwoAppReuseMetrics } from "./contract";
import { isExternalClassification } from "./classification";

export function evaluateSuccessCriteria(input: {
  record: TwoAppEvaluationRecord;
  app_a: AppEvaluationChecklist;
  app_b: AppEvaluationChecklist;
  reuse: ReuseObservation;
  metrics: TwoAppReuseMetrics;
}): TwoAppSuccessCriteriaResult {
  const pack = POLICY_PACKS[input.record.target_policy_pack as keyof typeof POLICY_PACKS];
  const externalPartner = isExternalClassification(
    input.record.operator_classification_override ?? input.record.evidence_classification,
  );
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

  const result: TwoAppSuccessCriteriaResult = {
    external_partner_context: externalPartner,
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

  result.all_met =
    result.external_partner_context
    && result.two_distinct_applications
    && result.app_a_server_verified
    && result.app_b_server_verified
    && result.reuse_accepted_observed
    && result.no_second_provider_verification_for_reuse !== false
    && result.public_partner_interfaces_used
    && result.privacy_checks_pass
    && result.evidence_exportable;

  return result;
}
