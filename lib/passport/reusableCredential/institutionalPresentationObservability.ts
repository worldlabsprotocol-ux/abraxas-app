// FILE: lib/passport/reusableCredential/institutionalPresentationObservability.ts
// Privacy-safe telemetry tied to durable institutional authorization state.

import { recordIntegrationEventOnce } from "@/lib/partner/integrationObservability/record";

export async function recordInstitutionalConsentConsumedTelemetry(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  environment: "sandbox" | "production";
  requestId: string;
  consentId: string;
  authorizationIdempotencyKey: string;
  applicationId?: string | null;
}): Promise<boolean> {
  return recordIntegrationEventOnce({
    partnerId: input.partnerId,
    applicationId: input.applicationId ?? null,
    environment: input.environment,
    eventType: "holder_flow_completed",
    lifecycleStage: "holder",
    outcome: "completed",
    requestId: input.requestId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    correlationId: input.authorizationIdempotencyKey,
    metadata: {
      outcome_class: "institutional_consent_consumed",
      public_code: input.consentId.slice(0, 12),
    },
  });
}

export async function recordInstitutionalReceiptIssuedTelemetry(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  environment: "sandbox" | "production";
  requestId: string;
  receiptId: string;
  consentId: string;
  authorizationIdempotencyKey: string;
  idempotentRecovery: boolean;
  applicationId?: string | null;
}): Promise<boolean> {
  if (input.idempotentRecovery) {
    return false;
  }
  return recordIntegrationEventOnce({
    partnerId: input.partnerId,
    applicationId: input.applicationId ?? null,
    environment: input.environment,
    eventType: "receipt_issued",
    lifecycleStage: "receipt",
    outcome: "issued",
    requestId: input.requestId,
    receiptId: input.receiptId,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    correlationId: input.authorizationIdempotencyKey,
    metadata: {
      outcome_class: "issuer_backed_authorization_commit",
      public_code: input.consentId.slice(0, 12),
    },
  });
}
