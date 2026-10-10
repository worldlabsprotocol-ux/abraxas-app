// FILE: lib/partner/universalIntegration/liveExecutionSignals.ts
// Distinguish offline harness proof from live holder-flow completion.

export interface IntegrationEventSlice {
  event_type: string;
  receipt_id?: string | null;
  correlation_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface LiveExecutionSignals {
  offline_harness_verified: boolean;
  live_holder_flow_completed: boolean;
  live_receipt_issued: boolean;
  live_e2e_complete: boolean;
}

export function deriveLiveExecutionSignals(input: {
  harnessPassed: boolean;
  verifiedReceiptCount: number;
  integrationEvents: IntegrationEventSlice[];
}): LiveExecutionSignals {
  const liveHolderFlowCompleted = input.integrationEvents.some(
    (row) => row.event_type === "holder_flow_completed",
  );
  const liveReceiptIssued = input.integrationEvents.some(
    (row) => row.event_type === "receipt_issued" && Boolean(row.receipt_id?.trim()),
  );
  const liveE2eComplete = liveHolderFlowCompleted && liveReceiptIssued;
  const offlineHarnessVerified = input.harnessPassed
    && input.verifiedReceiptCount > 0
    && !liveE2eComplete;

  return {
    offline_harness_verified: offlineHarnessVerified,
    live_holder_flow_completed: liveHolderFlowCompleted,
    live_receipt_issued: liveReceiptIssued,
    live_e2e_complete: liveE2eComplete,
  };
}
