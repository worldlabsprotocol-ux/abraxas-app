// FILE: lib/decisionReceipts/issuanceLifecycle.server.ts
import "server-only";

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { getReceiptById } from "@/lib/decisionReceipts/service";

export class IssuanceLifecycleError extends Error {
  constructor(
    message: string,
    readonly code:
      | "activate_failed"
      | "mark_failed"
      | "receipt_not_pending"
      | "receipt_not_found",
  ) {
    super(message);
    this.name = "IssuanceLifecycleError";
  }
}

async function mapUpdatedReceipt(receiptId: string): Promise<DecisionReceiptRecord> {
  const record = await getReceiptById(receiptId);
  if (!record) throw new IssuanceLifecycleError("receipt_not_found", "receipt_not_found");
  return record;
}

/** Commit durable authorization after evidence dependencies and mirror succeed. */
export async function activateDecisionReceiptIssuance(receiptId: string): Promise<DecisionReceiptRecord> {
  const sb = requireSupabaseAdmin();
  const finalizedAt = new Date().toISOString();
  const { data, error } = await sb
    .from("decision_receipts")
    .update({
      status: "active",
      issuance_finalized_at: finalizedAt,
    })
    .eq("id", receiptId)
    .eq("status", "pending_finalization")
    .select("*")
    .maybeSingle();

  if (error) {
    throw new IssuanceLifecycleError(`activate_failed:${error.message}`, "activate_failed");
  }
  if (!data) {
    const existing = await getReceiptById(receiptId);
    if (existing?.status === "active" && existing.issuance_finalized_at) {
      return existing;
    }
    throw new IssuanceLifecycleError("receipt_not_pending", "receipt_not_pending");
  }
  return mapUpdatedReceipt(receiptId);
}

/** Permanent ineligibility when finalization cannot complete. Pending receipts stay non-authorizable even if this fails. */
export async function markDecisionReceiptIssuanceFailed(receiptId: string): Promise<void> {
  const sb = requireSupabaseAdmin();
  const revokedAt = new Date().toISOString();
  const { data, error } = await sb
    .from("decision_receipts")
    .update({
      status: "revoked",
      revoked_at: revokedAt,
      revocation_reason_code: "issuance_incomplete",
    })
    .eq("id", receiptId)
    .in("status", ["pending_finalization", "active"])
    .select("id")
    .maybeSingle();

  if (error) {
    throw new IssuanceLifecycleError(`mark_failed:${error.message}`, "mark_failed");
  }
  if (!data) {
    const existing = await getReceiptById(receiptId);
    if (existing?.status === "revoked") return;
    if (existing?.status === "pending_finalization") {
      throw new IssuanceLifecycleError("mark_failed:pending_still_open", "mark_failed");
    }
  }
}
