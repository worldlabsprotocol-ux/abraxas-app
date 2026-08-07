// FILE: lib/x402/referenceGateway/receiptValidation.ts
// Fetch and validate Abraxas public decision receipts (fail closed).

import {
  validatePartnerFlowPublicReceipt,
  type PartnerFlowPublicReceipt,
} from "@/lib/partner/verifyPartnerFlowReceipt";

export interface ReceiptValidationInput {
  receiptId: string;
  partnerId: string;
  policyId: string;
  allowSandbox: boolean;
  abraxasPublicReceiptBaseUrl: string;
  now?: Date;
  fetchFn?: typeof fetch;
}

export type ReceiptValidationResult =
  | { ok: true; receipt: PartnerFlowPublicReceipt }
  | { ok: false; code: string; errors: string[] };

export async function fetchPublicReceipt(
  receiptId: string,
  abraxasPublicReceiptBaseUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<PartnerFlowPublicReceipt | null> {
  const base = abraxasPublicReceiptBaseUrl.replace(/\/$/, "");
  const res = await fetchFn(`${base}/api/receipts/${encodeURIComponent(receiptId)}/public`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return (await res.json()) as PartnerFlowPublicReceipt;
}

export async function validateAbraxasEligibilityReceipt(
  input: ReceiptValidationInput,
): Promise<ReceiptValidationResult> {
  const receiptId = input.receiptId?.trim();
  if (!receiptId) {
    return { ok: false, code: "receipt_missing", errors: ["receipt_id_required"] };
  }

  const fetchFn = input.fetchFn ?? fetch;
  let receipt: PartnerFlowPublicReceipt | null;
  try {
    receipt = await fetchPublicReceipt(receiptId, input.abraxasPublicReceiptBaseUrl, fetchFn);
  } catch {
    return { ok: false, code: "receipt_fetch_failed", errors: ["receipt_unreachable"] };
  }

  if (!receipt) {
    return { ok: false, code: "receipt_not_found", errors: ["receipt_not_found"] };
  }

  const validation = validatePartnerFlowPublicReceipt(receipt, {
    partnerId: input.partnerId,
    policyId: input.policyId,
    allowSandbox: input.allowSandbox,
    now: input.now,
  });

  if (!validation.ok) {
    return {
      ok: false,
      code: "receipt_invalid",
      errors: validation.errors,
    };
  }

  if (receipt.receipt_id && receipt.receipt_id !== receiptId) {
    return { ok: false, code: "receipt_id_mismatch", errors: ["receipt_id_mismatch"] };
  }

  return { ok: true, receipt };
}
