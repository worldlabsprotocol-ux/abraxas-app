// FILE: lib/decisionReceipts/issuanceLifecycle.server.ts
import "server-only";

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import {
  resolveIssuanceFinalizationSchemaCapability,
  StagedIssuanceUnavailableError,
} from "@/lib/decisionReceipts/issuanceSchemaCapability.server";
import { isReceiptIssuanceFinalized } from "@/lib/decisionReceipts/issuanceFinalization";
import { DECISION_RECEIPT_SCHEMA_V1_1 } from "@/lib/decisionReceipts/schema/v1_1_0";
import {
  finalizePendingV11ReceiptCryptographic,
} from "@/lib/decisionReceipts/v1_1_0/finalizePending.server";
import {
  resolveAuthoritativeApplicationIdForIssuance,
} from "@/lib/decisionReceipts/v1_1_0/authoritativeIssuance.server";

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

async function resolveLaunchpadApplicationIdForReceipt(
  record: DecisionReceiptRecord,
): Promise<string | null> {
  const sb = requireSupabaseAdmin();
  const { data: decision } = await sb
    .from("verification_decisions")
    .select("request_id")
    .eq("id", record.verification_decision_id)
    .maybeSingle();
  if (!decision?.request_id) return null;
  const { data: request } = await sb
    .from("verification_requests")
    .select("launchpad_application_id")
    .eq("id", decision.request_id as string)
    .maybeSingle();
  return (request?.launchpad_application_id as string | null) ?? null;
}

async function mapUpdatedReceipt(receiptId: string): Promise<DecisionReceiptRecord> {
  const record = await getReceiptById(receiptId);
  if (!record) throw new IssuanceLifecycleError("receipt_not_found", "receipt_not_found");
  return record;
}

/** Commit durable authorization after evidence dependencies and mirror succeed. */
export async function activateDecisionReceiptIssuance(receiptId: string): Promise<DecisionReceiptRecord> {
  const capability = await resolveIssuanceFinalizationSchemaCapability();
  if (!capability.stagedIssuanceEnabled) {
    throw new StagedIssuanceUnavailableError("staged_issuance_activation_unavailable");
  }

  const pending = await getReceiptById(receiptId);
  if (!pending) {
    throw new IssuanceLifecycleError("receipt_not_found", "receipt_not_found");
  }

  if (pending.schema_version === DECISION_RECEIPT_SCHEMA_V1_1) {
    const authoritativeAppId = await resolveLaunchpadApplicationIdForReceipt(pending);
    const appScope = await resolveAuthoritativeApplicationIdForIssuance({
      verificationDecisionId: pending.verification_decision_id,
      partnerId: pending.partner_id,
      callerApplicationId: authoritativeAppId,
    });
    return finalizePendingV11ReceiptCryptographic({
      receiptId,
      applicationId: appScope.applicationId,
      applicationScopeRequired: appScope.applicationScopeRequired,
    });
  }

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
    if (existing && isReceiptIssuanceFinalized(existing)) {
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
