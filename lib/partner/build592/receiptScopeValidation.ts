// FILE: lib/partner/build592/receiptScopeValidation.ts

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

export type ReceiptScopeValidation =
  | { ok: true }
  | { ok: false; code: "partner_mismatch" | "policy_mismatch" | "environment_mismatch" | "application_mismatch" };

export function validateReceiptSandboxScope(input: {
  signedRecord: DecisionReceiptRecord;
  expectedPartnerId: string;
  expectedPolicyId: string;
  expectedEnvironment?: string | null;
  expectedApplicationId?: string | null;
}): ReceiptScopeValidation {
  if (input.signedRecord.partner_id !== input.expectedPartnerId) {
    return { ok: false, code: "partner_mismatch" };
  }
  if (input.signedRecord.policy_id !== input.expectedPolicyId) {
    return { ok: false, code: "policy_mismatch" };
  }
  if (input.expectedEnvironment) {
    const ctx = input.signedRecord.decision_context ?? "";
    if (ctx === "production" && input.expectedEnvironment === "sandbox") {
      return { ok: false, code: "environment_mismatch" };
    }
  }
  const recordApplicationId = (
    input.signedRecord as DecisionReceiptRecord & { application_id?: string | null }
  ).application_id;
  if (
    input.expectedApplicationId
    && recordApplicationId
    && recordApplicationId !== input.expectedApplicationId
  ) {
    return { ok: false, code: "application_mismatch" };
  }
  return { ok: true };
}
