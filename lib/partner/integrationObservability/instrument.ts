// FILE: lib/partner/integrationObservability/instrument.ts
// verifyForAction and server-path instrumentation helpers.

import type { PartnerKitSafeResult } from "@/lib/partner/integrationKit/client";
import type { AbraxasPartnerKitOptions } from "@/lib/partner/integrationKit/client";
import { partnerSafeFailureCode } from "./failureCodes";
import { recordIntegrationEventBestEffort } from "./record";

export async function instrumentVerifyForActionResult(input: {
  options: Required<Pick<AbraxasPartnerKitOptions, "partnerId" | "policyId" | "environment">> & AbraxasPartnerKitOptions;
  verifyInput: {
    receiptId: string;
    expectedRequestId?: string;
    expectedEnvironment?: "sandbox" | "production";
  };
  result: PartnerKitSafeResult;
  latencyMs: number;
}): Promise<void> {
  const environment = input.verifyInput.expectedEnvironment ?? input.options.environment;
  const permitted = input.result.outcome === "permitted" && input.result.action === "permit";
  const reason = permitted ? null : partnerSafeFailureCode(input.result.errors, input.result.outcome);

  await recordIntegrationEventBestEffort({
    partnerId: input.options.partnerId,
    applicationId: input.options.applicationId ?? null,
    environment,
    eventType: permitted ? "receipt_verification_succeeded" : "receipt_verification_failed",
    lifecycleStage: "verification",
    outcome: input.result.outcome,
    partnerSafeReason: reason,
    requestId: input.verifyInput.expectedRequestId ?? null,
    receiptId: input.result.receipt_id ?? input.verifyInput.receiptId,
    policyId: input.options.policyId,
    policyVersion: input.options.policyVersion ?? null,
    latencyMs: input.latencyMs,
    metadata: {
      outcome_class: input.result.outcome,
      public_code: permitted ? "permit" : "deny",
    },
  });

  await recordIntegrationEventBestEffort({
    partnerId: input.options.partnerId,
    applicationId: input.options.applicationId ?? null,
    environment,
    eventType: permitted ? "access_decision_permit" : "access_decision_deny",
    lifecycleStage: "decision",
    outcome: input.result.action,
    partnerSafeReason: reason,
    requestId: input.verifyInput.expectedRequestId ?? null,
    receiptId: input.result.receipt_id ?? input.verifyInput.receiptId,
    policyId: input.options.policyId,
    policyVersion: input.options.policyVersion ?? null,
    metadata: { outcome_class: input.result.outcome },
  });
}
