// FILE: lib/passport/reusableCredential/institutionalPresentationObservability.ts
// Privacy-safe telemetry when issuer-backed institutional presentation succeeds.

import { recordIntegrationEventBestEffort } from "@/lib/partner/integrationObservability/record";

export async function recordInstitutionalPresentationIssuanceTelemetry(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  environment: "sandbox" | "production";
  requestId: string;
  receiptId: string;
}): Promise<void> {
  const base = {
    partnerId: input.partnerId,
    environment: input.environment,
    requestId: input.requestId,
    receiptId: input.receiptId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
  };

  await recordIntegrationEventBestEffort({
    ...base,
    eventType: "holder_flow_completed",
    lifecycleStage: "holder",
    outcome: "completed",
    metadata: { outcome_class: "institutional_consent_bound" },
  });

  await recordIntegrationEventBestEffort({
    ...base,
    eventType: "receipt_issued",
    lifecycleStage: "receipt",
    outcome: "issued",
    metadata: { outcome_class: "issuer_backed_presentation" },
  });
}
