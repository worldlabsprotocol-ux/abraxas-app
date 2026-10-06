// FILE: lib/partner/integrationKit/client.ts
// App wrapper: canonical verification from @abraxas/partner-kit + optional integration telemetry.

import {
  AbraxasPartnerKit as BasePartnerKit,
  permitProtocolAction,
  type AbraxasPartnerKitOptions,
  type PartnerKitSafeResult,
} from "@abraxas/partner-kit";
import type { PartnerFlowPublicReceipt } from "@abraxas/partner-kit/trust";

export type { AbraxasPartnerKitOptions, PartnerKitSafeResult };
export { permitProtocolAction };

export class AbraxasPartnerKit extends BasePartnerKit {
  async verifyForAction(input: Parameters<BasePartnerKit["verifyForAction"]>[0]): Promise<PartnerKitSafeResult> {
    const started = Date.now();
    const result = await super.verifyForAction(input);
    void this.emitVerificationTelemetry(input, result, Date.now() - started);
    return result;
  }

  private async emitCurrentValidityTelemetry(
    receiptId: string,
    receipt: PartnerFlowPublicReceipt,
    partnerId: string,
    policyId: string,
  ): Promise<void> {
    if (this.options.reportVerificationTelemetry === false) return;
    if (!this.options.applicationId && this.options.reportVerificationTelemetry !== true) return;
    try {
      const { recordIntegrationEventBestEffort } = await import("@/lib/partner/integrationObservability/record");
      await recordIntegrationEventBestEffort({
        partnerId,
        applicationId: this.options.applicationId ?? null,
        environment: this.options.environment,
        eventType: "receipt_current_validity_failed",
        lifecycleStage: "receipt",
        outcome: receipt.lifecycle_status ?? "invalidated",
        partnerSafeReason: (receipt.partner_safe_reason as import("@/lib/partner/integrationObservability/contract").PartnerSafeFailureCode | null) ?? "receipt_invalid",
        receiptId,
        policyId,
        policyVersion: this.options.policyVersion ?? null,
        metadata: { outcome_class: receipt.partner_safe_reason ?? "invalid" },
      });
    } catch {
      // Telemetry must never affect verification.
    }
  }

  private async emitVerificationTelemetry(
    input: {
      receiptId: string;
      expectedRequestId?: string;
      expectedEnvironment?: "sandbox" | "production";
    },
    result: PartnerKitSafeResult,
    latencyMs: number,
  ): Promise<void> {
    if (this.options.reportVerificationTelemetry === false) return;
    if (!this.options.applicationId && this.options.reportVerificationTelemetry !== true) return;
    try {
      const { instrumentVerifyForActionResult } = await import("@/lib/partner/integrationObservability/instrument");
      await instrumentVerifyForActionResult({
        options: this.options,
        verifyInput: input,
        result,
        latencyMs,
      });
    } catch {
      // Telemetry must never affect verification.
    }
  }

  async verifyEligibilityPresentation(
    envelope: unknown,
    expected: {
      verifier_nonce: string;
      policy_id: string;
      policy_version: number;
      action: string;
      environment: "sandbox" | "production";
    },
  ) {
    const { verifyPresentationWithKit } = await import("@/lib/eligibilityPresentation/kit");
    return verifyPresentationWithKit(this, envelope, expected);
  }
}
