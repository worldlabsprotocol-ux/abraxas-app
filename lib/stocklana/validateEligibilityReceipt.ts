// FILE: lib/stocklana/validateEligibilityReceipt.ts
// Server-side eligibility gate from Abraxas public receipt — no PII, fail-closed.

import {
  STOCKLANA_ELIGIBILITY_POLICY_ID,
  STOCKLANA_PARTNER_ID,
} from "@/lib/stocklana/constants";
import { isSessionReceiptExpired } from "@/lib/partner/sessionReceipt";

export type StocklanaEligibilityState =
  | "permitted"
  | "denied"
  | "pending"
  | "expired"
  | "error";

export interface PublicEligibilityReceipt {
  receipt_id: string;
  partner_id: string;
  policy_id: string;
  decision_result: string;
  reason_codes?: string[];
  expires_at: string | null;
  signature_valid: boolean;
  status: string;
  decision_context?: string;
  production_usable?: boolean;
  evaluated_at?: string;
  subject_pseudonym_id?: string;
}

const FORBIDDEN_RECEIPT_KEYS = [
  "date_of_birth",
  "address",
  "passport",
  "legal_name",
  "claim_value",
  "document",
  "biometric",
] as const;

export function assertReceiptResponseHasNoPii(payload: Record<string, unknown>): void {
  const serialized = JSON.stringify(payload).toLowerCase();
  for (const key of FORBIDDEN_RECEIPT_KEYS) {
    if (serialized.includes(key)) {
      throw new Error(`receipt_response_contains_forbidden_field:${key}`);
    }
  }
}

export function buildPartnerSafeReceiptSummary(receipt: PublicEligibilityReceipt) {
  return {
    receipt_id: receipt.receipt_id,
    partner_id: receipt.partner_id,
    policy_id: receipt.policy_id,
    decision_result: receipt.decision_result,
    reason_codes: receipt.reason_codes ?? [],
    status: receipt.status,
    signature_valid: receipt.signature_valid,
    expires_at: receipt.expires_at,
    decision_context: receipt.decision_context ?? null,
    production_usable: receipt.production_usable ?? false,
    evaluated_at: receipt.evaluated_at ?? null,
  };
}

export function resolveStocklanaEligibility(
  receipt: PublicEligibilityReceipt | null,
  options?: { partnerId?: string; policyId?: string },
): {
  state: StocklanaEligibilityState;
  purchasePermitted: boolean;
  detail: string;
  partnerView: ReturnType<typeof buildPartnerSafeReceiptSummary> | null;
} {
  const partnerId = options?.partnerId ?? STOCKLANA_PARTNER_ID;
  const policyId = options?.policyId ?? STOCKLANA_ELIGIBILITY_POLICY_ID;

  if (!receipt) {
    return {
      state: "error",
      purchasePermitted: false,
      detail: "receipt_missing",
      partnerView: null,
    };
  }

  assertReceiptResponseHasNoPii(receipt as unknown as Record<string, unknown>);
  const partnerView = buildPartnerSafeReceiptSummary(receipt);

  if (receipt.partner_id !== partnerId) {
    return { state: "error", purchasePermitted: false, detail: "partner_mismatch", partnerView };
  }
  if (receipt.policy_id !== policyId) {
    return { state: "error", purchasePermitted: false, detail: "policy_mismatch", partnerView };
  }
  if (!receipt.signature_valid) {
    return { state: "error", purchasePermitted: false, detail: "signature_invalid", partnerView };
  }
  if (receipt.status === "revoked") {
    return { state: "denied", purchasePermitted: false, detail: "receipt_revoked", partnerView };
  }
  if (receipt.decision_result === "manual_review") {
    return { state: "pending", purchasePermitted: false, detail: "manual_review", partnerView };
  }
  if (receipt.decision_result === "denied") {
    const usBlocked = (receipt.reason_codes ?? []).includes("jurisdiction_blocked");
    return {
      state: "denied",
      purchasePermitted: false,
      detail: usBlocked ? "jurisdiction_blocked_us" : "policy_denied",
      partnerView,
    };
  }
  if (receipt.decision_result !== "approved") {
    return { state: "error", purchasePermitted: false, detail: "unknown_decision", partnerView };
  }
  if (isSessionReceiptExpired(receipt.expires_at)) {
    return { state: "expired", purchasePermitted: false, detail: "receipt_expired", partnerView };
  }

  return {
    state: "permitted",
    purchasePermitted: true,
    detail: "eligibility_approved",
    partnerView,
  };
}
