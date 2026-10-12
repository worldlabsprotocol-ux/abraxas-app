import type { DecisionReceiptDisplayModel } from "@/lib/protocol/decisionReceiptDisplay";
import { RECEIPT_ADVANCED_TOGGLE, RECEIPT_PLAIN_LABELS } from "@/lib/product/productStoryCopy";

export type ReceiptPlainSummary = {
  checked: string;
  shared: string;
  recipient: string;
  valid: string | null;
  next: string;
};

export function buildReceiptPlainSummary(model: DecisionReceiptDisplayModel): ReceiptPlainSummary {
  const checked = model.policyLabel || "Eligibility policy";
  const shared = model.resultLabel || model.disclosedResult || "Eligibility result";
  const recipient = model.partnerName || model.partnerId || "The requesting application";
  const valid = model.validUntil
    ? model.validUntil
    : model.visualStatus === "expired"
      ? "Expired"
      : null;

  let next = "You can close this confirmation or return to the application that sent you here.";
  if (model.visualStatus === "expired" || model.currentlyValid === false) {
    next = "This answer is no longer valid. Start a new request from the partner if you still need access.";
  } else if (model.visualStatus === "sandbox") {
    next = "This was a sandbox test — it cannot be used for real production access.";
  } else if (model.solanaProvenance && !model.solanaProvenance.proof_confirmed) {
    next = "On-chain confirmation is still pending. Your signed receipt is valid off-chain until the chain proof completes.";
  }

  return { checked, shared, recipient, valid, next };
}

export { RECEIPT_ADVANCED_TOGGLE, RECEIPT_PLAIN_LABELS };
