// FILE: lib/partner/twoAppEvaluation/buildEvaluation.ts
// Assemble full evaluation view from observable events.

import type { TwoAppEvaluationRecord, TwoAppEvaluationView } from "./contract";
import { EXTERNAL_TWO_APP_REUSE_EVENT } from "./contract";
import { buildAppAChecklist, buildAppBChecklist } from "./checklist";
import { deriveEvaluationStage } from "./deriveStage";
import { loadTwoAppObservationContext } from "./observe";
import { observeReuse, computeReuseMetrics } from "./reuseMetrics";
import { computeEvaluationTimeToValue } from "./timeToValue";
import { detectEvaluationBlockers } from "./blockers";
import { evaluateSuccessCriteria } from "./successCriteria";
import { buildPayloadComparison } from "./payloadComparison";
import { buildPartnerSummary } from "./partnerSummary";
import { buildTwoAppEvidencePacket } from "./evidencePacket";

export async function buildTwoAppEvaluationView(
  record: TwoAppEvaluationRecord,
): Promise<TwoAppEvaluationView> {
  const ctx = await loadTwoAppObservationContext(record);

  const app_a = buildAppAChecklist({
    application: ctx.app_a,
    displayName: record.app_a.display_name,
    events: ctx.events_a,
    activity: ctx.activity_a,
  });

  const app_b = buildAppBChecklist({
    application: ctx.app_b,
    displayName: record.app_b.display_name,
    events: ctx.events_b,
    activity: ctx.activity_b,
    appAReady: app_a.server_verification_passed,
  });

  const reuse = observeReuse({ app_b_events: ctx.events_b });
  const reuse_metrics = computeReuseMetrics({
    app_a_events: ctx.events_a,
    app_b_events: ctx.events_b,
    app_a_activity: ctx.activity_a,
    app_b_activity: ctx.activity_b,
    reuse,
    app_a_verified: app_a.server_verification_passed,
    app_b_verified: app_b.server_verification_passed,
  });

  const { stage, source: stage_source } = deriveEvaluationStage({
    record,
    ctx,
    app_a,
    app_b,
    reuse,
  });

  const time_to_value = computeEvaluationTimeToValue({
    record,
    app_a,
    app_b,
    reuse,
    sandboxReadyAt: ctx.app_a?.created_at ?? null,
  });

  const success_criteria = evaluateSuccessCriteria({
    record,
    app_a,
    app_b,
    reuse,
    metrics: reuse_metrics,
  });

  const payload_comparison = buildPayloadComparison({
    targetPolicyPack: record.target_policy_pack,
    metrics: reuse_metrics,
  });

  const blockers = detectEvaluationBlockers({
    app_a,
    app_b,
    reuse,
    explicit: record.blocked_category,
  });

  const partner_summary = buildPartnerSummary({ success: success_criteria, time_to_value });

  const view: TwoAppEvaluationView = {
    record,
    stage,
    stage_source,
    app_a,
    app_b,
    reuse,
    reuse_metrics,
    time_to_value,
    payload_comparison,
    success_criteria,
    partner_summary,
    blockers,
    evidence_packet_ready: success_criteria.evidence_exportable,
    commercial_success_event: success_criteria.all_met
      ? EXTERNAL_TWO_APP_REUSE_EVENT
      : "NOT_YET_OBSERVED",
  };

  return view;
}

export async function buildTwoAppEvaluationEvidenceExport(
  record: TwoAppEvaluationRecord,
) {
  const view = await buildTwoAppEvaluationView(record);
  return buildTwoAppEvidencePacket(view);
}
