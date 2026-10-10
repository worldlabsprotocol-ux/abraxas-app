// FILE: lib/partner/universalIntegration/stagingExecutionEvidence.ts
// Safe staging execution record — no PII, tokens, or holder identifiers.

import type { LiveSandboxExecutionReport } from "./liveSandboxExecution";
import type { LiveE2eRunnerReport } from "./exampleMerchantLiveE2eRunner";
import type { StagingActivationReadinessReport } from "./stagingActivationReadiness";

export interface StagingLiveExecutionEvidence {
  schema_version: 1;
  recorded_at: string;
  environment: "sandbox";
  partner_id: string;
  policy_id: string;
  application_id: string | null;
  correlation_id: string | null;
  receipt_id: string | null;
  holder_flow: "completed" | "checkpoint" | "not_run" | "failed";
  receipt_trust: "pass" | "fail" | "skipped" | "not_run";
  live_e2e_complete: boolean;
  latency_ms: number | null;
  failure_category: string | null;
  source: "playwright_and_harness" | "readiness_only";
}

export function buildStagingLiveExecutionEvidence(input: {
  readiness: StagingActivationReadinessReport;
  playwright?: LiveE2eRunnerReport | null;
  harness?: LiveSandboxExecutionReport | null;
  partnerId: string;
  policyId: string;
  applicationId?: string | null;
  correlationId?: string | null;
  receiptId?: string | null;
  startedMs?: number;
}): StagingLiveExecutionEvidence {
  const playwright = input.playwright;
  const harness = input.harness;
  let holder_flow: StagingLiveExecutionEvidence["holder_flow"] = "not_run";
  if (playwright?.overall === "pass") holder_flow = "completed";
  else if (playwright?.overall === "checkpoint") holder_flow = "checkpoint";
  else if (playwright?.overall === "blocked") holder_flow = "failed";

  let receipt_trust: StagingLiveExecutionEvidence["receipt_trust"] = "not_run";
  const verifyStage = harness?.stages.find((s) => s.id === "live_receipt_verify");
  if (verifyStage?.status === "pass") receipt_trust = "pass";
  else if (verifyStage?.status === "fail") receipt_trust = "fail";
  else if (verifyStage?.status === "skipped") receipt_trust = "skipped";

  const live_e2e_complete = Boolean(harness?.live_e2e_complete);
  const failure_category = playwright?.blockers[0]
    ?? harness?.blockers[0]
    ?? (input.readiness.overall !== "ready_to_execute" ? input.readiness.overall : null);

  return {
    schema_version: 1,
    recorded_at: new Date().toISOString(),
    environment: "sandbox",
    partner_id: input.partnerId,
    policy_id: input.policyId,
    application_id: input.applicationId ?? null,
    correlation_id: input.correlationId ?? null,
    receipt_id: input.receiptId ?? null,
    holder_flow,
    receipt_trust,
    live_e2e_complete,
    latency_ms: input.startedMs ? Date.now() - input.startedMs : null,
    failure_category: failure_category,
    source: playwright || harness ? "playwright_and_harness" : "readiness_only",
  };
}
