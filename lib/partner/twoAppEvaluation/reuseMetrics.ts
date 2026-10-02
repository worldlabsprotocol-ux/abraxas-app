// FILE: lib/partner/twoAppEvaluation/reuseMetrics.ts
// Observed reuse metrics — never copy reference harness numbers.

import { isLiveEvent } from "@/lib/partner/pilotEvidence/dedupe";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";
import type { LaunchpadActivityRow } from "@/lib/partner/pilotEvidence/load";
import type { ReuseObservation, TwoAppReuseMetrics } from "./contract";

export function observeReuse(input: {
  app_b_events: IntegrationEventRow[];
}): ReuseObservation {
  for (const event of input.app_b_events) {
    if (!isLiveEvent(event)) continue;
    if (event.event_type === "evidence_reuse_accepted") {
      return {
        status: "accepted",
        observed_at: event.created_at,
        source: "partner_integration_events:evidence_reuse_accepted",
        safe_reason: null,
      };
    }
    if (event.event_type === "evidence_refresh_required") {
      return {
        status: "refresh_required",
        observed_at: event.created_at,
        source: "partner_integration_events:evidence_refresh_required",
        safe_reason: event.partner_safe_reason ?? "Evidence refresh required before reuse.",
      };
    }
    if (event.event_type === "evidence_reuse_rejected") {
      return {
        status: "rejected",
        observed_at: event.created_at,
        source: "partner_integration_events:evidence_reuse_rejected",
        safe_reason: event.partner_safe_reason ?? event.outcome ?? "Reuse rejected by policy compatibility.",
      };
    }
  }
  return { status: "not_yet_observed", observed_at: null, source: null, safe_reason: null };
}

export function computeReuseMetrics(input: {
  app_a_events: IntegrationEventRow[];
  app_b_events: IntegrationEventRow[];
  app_a_activity: LaunchpadActivityRow[];
  app_b_activity: LaunchpadActivityRow[];
  reuse: ReuseObservation;
  app_a_verified: boolean;
  app_b_verified: boolean;
}): TwoAppReuseMetrics {
  const liveA = input.app_a_events.filter(isLiveEvent);
  const liveB = input.app_b_events.filter(isLiveEvent);

  const proofCreatedA = input.app_a_activity.filter((a) => a.event_type === "proof_created").length;
  const proofCreatedB = input.app_b_activity.filter((a) => a.event_type === "proof_created").length;
  const proofReusedB = input.app_b_activity.filter((a) => a.event_type === "proof_reused").length;

  let underlyingCount: number | null = null;
  if (proofCreatedA + proofCreatedB > 0 || proofReusedB > 0) {
    underlyingCount = proofCreatedA + (proofReusedB > 0 ? 0 : proofCreatedB);
  } else {
    const holderCompletesA = liveA.filter((e) => e.event_type === "holder_flow_completed").length;
    const holderCompletesB = liveB.filter((e) => e.event_type === "holder_flow_completed").length;
    if (holderCompletesA + holderCompletesB > 0) {
      underlyingCount = input.reuse.status === "accepted"
        ? Math.max(1, holderCompletesA)
        : holderCompletesA + holderCompletesB;
    }
  }

  const verifiedApps =
    (input.app_a_verified ? 1 : 0) + (input.app_b_verified ? 1 : 0);

  let recollections: number | null = null;
  if (input.reuse.status === "accepted" && underlyingCount != null) {
    recollections = Math.max(0, (proofCreatedA + proofCreatedB) - 1);
  }

  const hasAnyData = liveA.length > 0 || liveB.length > 0;
  const metricsQuality: TwoAppReuseMetrics["metrics_quality"] = !hasAnyData
    ? "not_yet_observed"
    : input.reuse.status === "accepted" && input.app_a_verified && input.app_b_verified
      ? "observed"
      : "partial";

  return {
    underlying_verification_events: underlyingCount,
    applications_with_verified_results: verifiedApps,
    additional_raw_kyc_recollections: recollections,
    reuse_status: input.reuse.status,
    server_verification_app_a: input.app_a_verified,
    server_verification_app_b: input.app_b_verified,
    metrics_quality: metricsQuality,
  };
}
