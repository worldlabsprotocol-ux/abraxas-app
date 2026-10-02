// FILE: lib/operations/institutionalProof/externalConsumer.ts
// Reference institutional integrator — public Abraxas interfaces only.

import { AbraxasPartnerKit } from "@/lib/partner/integrationKit";
import {
  validatePartnerFlowPublicReceipt,
  type PartnerFlowPublicReceipt,
} from "@/lib/partner/verifyPartnerFlowReceipt";
import type { NarrowPartnerResult } from "@/lib/partner/narrowPartnerResult/contract";

export interface ExternalApplicationVerification {
  receipt_id: string;
  decision_result: string | null;
  result_family: string | null;
  pairwise_subject_ref: string | null;
  receipt_verification_ok: boolean;
  receipt_errors: string[];
  narrow_verification_ok: boolean;
  kit_outcome: string | null;
}

export interface ExternalConsumerOptions {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  applicationId: string;
  environment: "sandbox" | "production";
  policyPackId?: string;
  fetchFn?: typeof fetch;
}

/**
 * Simulates an external relying application consuming ONLY documented Abraxas surfaces.
 * Must not import Supabase, credential stores, or receipt DB services.
 */
export class ExternalInstitutionalConsumer {
  private readonly kit: AbraxasPartnerKit;

  constructor(private readonly options: ExternalConsumerOptions) {
    this.kit = new AbraxasPartnerKit({
      partnerId: options.partnerId,
      policyId: options.policyId,
      policyVersion: options.policyVersion,
      environment: options.environment,
      applicationId: options.applicationId,
      policyPackId: options.policyPackId ?? "age_21_retail",
      fetchFn: options.fetchFn,
    });
  }

  async verifyApplicationResult(input: {
    receiptId: string;
    requestId: string;
    publicReceipt: PartnerFlowPublicReceipt;
    narrowResult: NarrowPartnerResult;
  }): Promise<ExternalApplicationVerification> {
    const receiptValidation = validatePartnerFlowPublicReceipt(input.publicReceipt, {
      partnerId: this.options.partnerId,
      policyId: this.options.policyId,
      mode: this.options.environment,
      allowSandbox: this.options.environment === "sandbox",
    });

    const verified = await this.kit.verifyCallbackWithNarrowResult({
      search: new URLSearchParams({
        receipt_id: input.receiptId,
        request_id: input.requestId,
      }),
      expectedRequestId: input.requestId,
    });

    return {
      receipt_id: input.receiptId,
      decision_result: input.narrowResult.decision ?? input.publicReceipt.decision_result ?? null,
      result_family: input.narrowResult.result_family ?? null,
      pairwise_subject_ref: input.narrowResult.pairwise_subject_ref ?? null,
      receipt_verification_ok: receiptValidation.ok,
      receipt_errors: receiptValidation.errors,
      narrow_verification_ok: verified.ok,
      kit_outcome: verified.ok ? verified.verification.outcome : null,
    };
  }
}
