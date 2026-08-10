// FILE: lib/demo/partnerSandboxDemoBoundaries.ts
// Hard sandbox identifiers — reject any other partner, policy, or receipt scope.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import {
  SANDBOX_PARTNER_ID,
  SANDBOX_POLICY_ID,
  isSandboxPolicyId,
} from "@/lib/partner/sandboxPartner";

export const DEMO_SANDBOX_PARTNER_ID = SANDBOX_PARTNER_ID;
export const DEMO_SANDBOX_POLICY_ID = SANDBOX_POLICY_ID;

export function assertSandboxDemoPartnerPolicy(input: {
  partnerId: string;
  policyId: string;
}): void {
  if (input.partnerId !== DEMO_SANDBOX_PARTNER_ID) {
    throw new Error("demo_partner_not_allowed");
  }
  if (input.policyId !== DEMO_SANDBOX_POLICY_ID || !isSandboxPolicyId(input.policyId)) {
    throw new Error("demo_policy_not_allowed");
  }
}

export function assertSandboxDemoReceipt(record: DecisionReceiptRecord): void {
  if (record.partner_id !== DEMO_SANDBOX_PARTNER_ID) {
    throw new Error("demo_receipt_partner_not_allowed");
  }
  if (record.policy_id !== DEMO_SANDBOX_POLICY_ID) {
    throw new Error("demo_receipt_policy_not_allowed");
  }
  if (record.decision_context !== "sandbox_only") {
    throw new Error("demo_receipt_not_sandbox");
  }
}

export function rejectClientSuppliedSubject(input: {
  bodySubjectId?: string | null;
  querySubjectId?: string | null;
}): void {
  if (input.bodySubjectId?.trim()) {
    throw new Error("client_subject_not_allowed");
  }
  if (input.querySubjectId?.trim()) {
    throw new Error("client_subject_not_allowed");
  }
}

const DEMO_RECEIPT_ID_PATTERN = /^dr_[A-Za-z0-9_-]{8,128}$/;

export function validateDemoReceiptId(
  receiptId: string,
): { ok: true; receiptId: string } | { ok: false; error: string } {
  const trimmed = receiptId.trim();
  if (!trimmed) {
    return { ok: false, error: "receipt_id_required" };
  }
  if (trimmed.length > 200 || !DEMO_RECEIPT_ID_PATTERN.test(trimmed)) {
    return { ok: false, error: "receipt_id_invalid" };
  }
  return { ok: true, receiptId: trimmed };
}
