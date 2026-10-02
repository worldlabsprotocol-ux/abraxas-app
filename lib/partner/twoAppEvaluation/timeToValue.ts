// FILE: lib/partner/twoAppEvaluation/timeToValue.ts
// Observed time-to-value — not SLA or marketing promise.

import type { TwoAppEvaluationRecord, TwoAppTimeToValue } from "./contract";
import type { AppEvaluationChecklist } from "./contract";
import type { ReuseObservation } from "./contract";

function msBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const delta = Date.parse(end) - Date.parse(start);
  return Number.isFinite(delta) && delta >= 0 ? delta : null;
}

export function computeEvaluationTimeToValue(input: {
  record: TwoAppEvaluationRecord;
  app_a: AppEvaluationChecklist;
  app_b: AppEvaluationChecklist;
  reuse: ReuseObservation;
  sandboxReadyAt: string | null;
}): TwoAppTimeToValue {
  const start = input.record.started_at;
  const firstResult = input.app_a.result_verified_at;
  const appASuccess = input.app_a.result_verified_at;
  const appBConfigured = input.app_b.items.find((i) => i.id === "configured")?.observed_at ?? null;
  const reuseAt = input.reuse.observed_at;

  return {
    evaluation_start_to_sandbox_ready_ms: msBetween(start, input.sandboxReadyAt ?? start),
    evaluation_start_to_first_verified_result_ms: msBetween(start, firstResult),
    app_a_success_to_app_b_configured_ms: msBetween(appASuccess, appBConfigured),
    app_a_success_to_reuse_success_ms: msBetween(appASuccess, reuseAt),
    evaluation_start_to_reuse_success_ms: msBetween(start, reuseAt),
    notice: "Observed evaluation measurement only — not an SLA, benchmark, or marketing promise.",
  };
}

export function formatDurationMs(ms: number | null): string | null {
  if (ms == null) return null;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}
