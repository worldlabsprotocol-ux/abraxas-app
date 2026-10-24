// FILE: lib/persistence/boundary/staging/recoveryMetrics.ts

export type SovereignRecoveryDrillMetrics = {
  export_started_at_ms: number;
  export_completed_at_ms: number;
  restore_completed_at_ms: number;
  reconcile_completed_at_ms: number;
  /** Upper bound on data loss window for this drill (export time minus last fixture write). */
  rpo_bound_ms: number;
  /** Export start through successful reconcile on restore target. */
  rto_observed_ms: number;
};

export function computeRecoveryMetrics(input: {
  last_write_at_ms: number;
  export_started_at_ms: number;
  export_completed_at_ms: number;
  restore_completed_at_ms: number;
  reconcile_completed_at_ms: number;
}): SovereignRecoveryDrillMetrics {
  const rpo_bound_ms = Math.max(0, input.export_completed_at_ms - input.last_write_at_ms);
  const rto_observed_ms = input.reconcile_completed_at_ms - input.export_started_at_ms;
  return {
    ...input,
    rpo_bound_ms,
    rto_observed_ms,
  };
}
