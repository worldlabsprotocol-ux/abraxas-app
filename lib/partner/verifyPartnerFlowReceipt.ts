// FILE: lib/partner/verifyPartnerFlowReceipt.ts
// Server-side Partner Flow receipt validation against public receipt view.

import {
  evaluatePublicReceiptTrust,
  type TrustEvaluationResult,
} from "@/lib/decisionReceipts/trustEvaluation";

export interface PartnerFlowPublicReceipt {
  receipt_id?: string;
  partner_id?: string;
  policy_id?: string;
  decision_result?: string;
  signature_valid?: boolean;
  expires_at?: string | null;
  status?: string;
  production_usable?: boolean;
  evaluated_claim_refs?: Array<{
    claim_id?: string;
    claim_type?: string;
    issuer_id?: string;
    status?: string;
    issued_at?: string;
    expires_at?: string | null;
  }>;
  currently_valid?: boolean;
  validity?: string;
  invalidation_reasons?: string[];
}

export interface PartnerFlowReceiptExpectations {
  partnerId: string;
  policyId: string;
  /** Defaults to new Date() — inject in tests */
  now?: Date;
  /**
   * When false (default), require production_usable === true.
   * Set true only for explicit sandbox / pilot policy testing.
   */
  allowSandbox?: boolean;
}

export interface PartnerFlowReceiptValidationResult {
  ok: boolean;
  errors: string[];
  trust?: TrustEvaluationResult;
}

export function validatePartnerFlowPublicReceipt(
  receipt: PartnerFlowPublicReceipt | null | undefined,
  expected: PartnerFlowReceiptExpectations,
): PartnerFlowReceiptValidationResult {
  const trust = evaluatePublicReceiptTrust(receipt, {
    partnerId: expected.partnerId,
    policyId: expected.policyId,
    allowSandbox: expected.allowSandbox,
    now: expected.now,
  });

  return {
    ok: trust.currently_valid,
    errors: trust.invalidation_reasons,
    trust,
  };
}
