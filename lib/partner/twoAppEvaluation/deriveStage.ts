// FILE: lib/partner/twoAppEvaluation/deriveStage.ts
// Derive evaluation stage from observable events — no manual success buttons.

import type { TwoAppEvaluationRecord, TwoAppEvaluationStage } from "./contract";
import type { TwoAppObservationContext } from "./observe";
import type { AppEvaluationChecklist } from "./contract";
import type { ReuseObservation } from "./contract";

export function deriveEvaluationStage(input: {
  record: TwoAppEvaluationRecord;
  ctx: TwoAppObservationContext;
  app_a: AppEvaluationChecklist;
  app_b: AppEvaluationChecklist;
  reuse: ReuseObservation;
}): { stage: TwoAppEvaluationStage; source: string } {
  const { record, ctx, app_a, app_b, reuse } = input;

  if (record.blocked_category) {
    return { stage: "blocked", source: "evaluation.blocked_category" };
  }

  const sandboxReady = Boolean(ctx.app_a && ctx.app_b);
  const appAConfigured = app_a.items.find((i) => i.id === "configured")?.status === "observed";
  const appAVerified = app_a.server_verification_passed;
  const appBConfigured = app_b.items.find((i) => i.id === "configured")?.status === "observed";
  const appBVerified = app_b.server_verification_passed;
  const reuseConfirmed = reuse.status === "accepted";
  const reuseAttempted = reuse.status !== "not_yet_observed";

  if (reuseConfirmed && appAVerified && appBVerified) {
    return { stage: "evaluation_complete", source: "reuse_confirmed+server_verification_both_apps" };
  }
  if (reuseConfirmed && appBVerified) {
    return { stage: "evidence_ready", source: "reuse_confirmed+app_b_verified" };
  }
  if (reuseConfirmed) {
    return { stage: "reuse_confirmed", source: "partner_integration_events:evidence_reuse_accepted" };
  }
  if (appBVerified) {
    return { stage: "app_b_result_verified", source: "partner_integration_events:receipt_verification_succeeded(app_b)" };
  }
  if (reuseAttempted) {
    return { stage: "reuse_attempted", source: reuse.source ?? "partner_integration_events:evidence_reuse_*" };
  }
  if (appAVerified) {
    return { stage: "app_a_result_verified", source: "partner_integration_events:receipt_verification_succeeded(app_a)" };
  }
  if (appBConfigured || app_b.items.find((i) => i.id === "request")?.status === "observed") {
    return { stage: "app_b_configured", source: "partner_launchpad_applications(app_b)" };
  }
  if (appAConfigured) {
    return { stage: "app_a_configured", source: "partner_launchpad_applications(app_a)" };
  }
  if (sandboxReady) {
    return { stage: "sandbox_ready", source: "two_app_provision_complete" };
  }
  if (record.discovery_completed_at) {
    return { stage: "discovery_complete", source: "gtm_discovery" };
  }
  return { stage: "invited", source: "evaluation.created" };
}
