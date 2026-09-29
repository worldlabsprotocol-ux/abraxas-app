// FILE: lib/passport/reusableEligibility/observability.ts
// Privacy-safe reusable evidence lifecycle telemetry. Best effort only.

import { recordIntegrationEventBestEffort } from "@/lib/partner/integrationObservability/record";
import type { EvidenceReuseDecisionResult } from "./decision";
import type { InternalReusableFact } from "./contract";

export async function recordEvidenceReuseTelemetry(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  environment: "sandbox" | "production";
  verifyRequestId?: string | null;
  fact?: InternalReusableFact | null;
  decision: EvidenceReuseDecisionResult;
}): Promise<void> {
  const eventType = input.decision.decision === "reuse"
    ? "evidence_reuse_accepted"
    : input.decision.decision === "refresh_required"
      ? "evidence_refresh_required"
      : "evidence_reuse_rejected";

  await recordIntegrationEventBestEffort({
    partnerId: input.partnerId,
    environment: input.environment,
    eventType,
    lifecycleStage: "policy",
    outcome: input.decision.decision,
    partnerSafeReason: input.decision.decision === "refresh_required"
      ? "evidence_refresh_required"
      : null,
    requestId: input.verifyRequestId ?? null,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    metadata: {
      outcome_class: input.decision.decision,
      public_code: input.decision.reason,
    },
  });
}

export async function recordEvidenceReuseLookupTelemetry(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  environment: "sandbox" | "production";
  verifyRequestId?: string | null;
  decision: EvidenceReuseDecisionResult | null;
  fact?: InternalReusableFact | null;
}): Promise<void> {
  if (!input.decision) return;
  await recordEvidenceReuseTelemetry({
    partnerId: input.partnerId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    environment: input.environment,
    verifyRequestId: input.verifyRequestId,
    fact: input.fact,
    decision: input.decision,
  });
}
