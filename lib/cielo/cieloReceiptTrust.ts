// FILE: lib/cielo/cieloReceiptTrust.ts
// Fail-closed receipt trust for Cielo merchant submit (canonical decision_receipts).

import { getPartnerReceipt } from "@/lib/decisionReceipts/service";
import { CIELO_PARTNER_ID, CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/cieloIds";

export async function assertCieloDecisionReceiptCurrentlyValid(input: {
  receiptId: string;
  decisionId: string;
  consentReceiptId: string;
}): Promise<void> {
  const partnerReceipt = await getPartnerReceipt(input.receiptId, CIELO_PARTNER_ID);
  if (!partnerReceipt || "error" in partnerReceipt) {
    throw new Error("Decision receipt not found or wrong partner audience");
  }
  if (!partnerReceipt.valid || !partnerReceipt.currently_valid) {
    const reasons = partnerReceipt.invalidation_reasons?.join(", ") ?? partnerReceipt.validity ?? "invalid";
    throw new Error(`Decision receipt is not currently valid: ${reasons}`);
  }
  const view = partnerReceipt.view;
  if (view?.policy_id && view.policy_id !== CIELO_VERIFIED_GUEST_POLICY_ID) {
    throw new Error("Decision receipt policy mismatch");
  }
  const decisionId = (view as { decision_id?: string } | undefined)?.decision_id;
  if (decisionId && decisionId !== input.decisionId) {
    throw new Error("Decision receipt does not match verification decision");
  }
  if (view?.consent_receipt_id && view.consent_receipt_id !== input.consentReceiptId) {
    throw new Error("Decision receipt consent binding mismatch");
  }
}
