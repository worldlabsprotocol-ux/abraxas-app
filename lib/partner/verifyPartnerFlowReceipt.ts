// FILE: lib/partner/verifyPartnerFlowReceipt.ts
// Server-side Partner Flow receipt validation against public receipt view.

export interface PartnerFlowPublicReceipt {
  receipt_id?: string;
  partner_id?: string;
  policy_id?: string;
  decision_result?: string;
  signature_valid?: boolean;
  expires_at?: string | null;
  status?: string;
}

export interface PartnerFlowReceiptExpectations {
  partnerId: string;
  policyId: string;
  /** Defaults to new Date() — inject in tests */
  now?: Date;
}

export interface PartnerFlowReceiptValidationResult {
  ok: boolean;
  errors: string[];
}

export function validatePartnerFlowPublicReceipt(
  receipt: PartnerFlowPublicReceipt | null | undefined,
  expected: PartnerFlowReceiptExpectations,
): PartnerFlowReceiptValidationResult {
  const errors: string[] = [];
  const now = expected.now ?? new Date();

  if (!receipt || typeof receipt !== "object") {
    return { ok: false, errors: ["receipt_missing"] };
  }

  if (receipt.signature_valid !== true) {
    errors.push("signature_invalid");
  }

  if (receipt.decision_result !== "approved") {
    errors.push(`decision_not_approved:${receipt.decision_result ?? "missing"}`);
  }

  if (receipt.partner_id !== expected.partnerId) {
    errors.push(`partner_mismatch:expected=${expected.partnerId},got=${receipt.partner_id ?? "missing"}`);
  }

  if (receipt.policy_id !== expected.policyId) {
    errors.push(`policy_mismatch:expected=${expected.policyId},got=${receipt.policy_id ?? "missing"}`);
  }

  if (receipt.expires_at) {
    const expiresAt = new Date(receipt.expires_at);
    if (Number.isNaN(expiresAt.getTime())) {
      errors.push("expires_at_invalid");
    } else if (expiresAt.getTime() <= now.getTime()) {
      errors.push("receipt_expired");
    }
  }

  if (receipt.status && receipt.status !== "active") {
    errors.push(`status_not_active:${receipt.status}`);
  }

  return { ok: errors.length === 0, errors };
}
