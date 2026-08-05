// FILE: lib/partner/sessionDecision.ts
// Idempotent session decision lookup — reuse active decision within TTL.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getReceiptByDecisionId } from "@/lib/decisionReceipts/service";
import type { StoredPartnerFlowDecisionIdentity } from "@/lib/partner/partnerFlowIdempotency";
import {
  isMissingIdempotencyKeyColumnError,
  isVerificationDecisionIdempotencyKeyAvailable,
  markVerificationDecisionIdempotencyKeyAbsent,
} from "@/lib/partner/verificationDecisionsSchema";

export interface ActiveSessionDecision {
  decision_id: string;
  receipt_id: string;
  receipt_expires_at: string;
}

function mapDecisionIdentity(row: Record<string, unknown>): StoredPartnerFlowDecisionIdentity {
  return {
    decision_id: row.id as string,
    partner_id: row.partner_id as string,
    subject_id: row.subject_id as string,
    policy_id: row.policy_id as string,
    request_id: (row.request_id as string | null) ?? null,
    idempotency_key: (row.idempotency_key as string | null) ?? null,
    valid_until: (row.valid_until as string | null) ?? null,
  };
}

async function toActiveSessionDecision(
  decisionId: string,
  validUntil: string,
): Promise<ActiveSessionDecision | null> {
  const receipt = await getReceiptByDecisionId(decisionId);
  if (!receipt) return null;
  return {
    decision_id: decisionId,
    receipt_id: receipt.id,
    receipt_expires_at: validUntil,
  };
}

/** Find reusable session decision for partner+subject+policy within valid_until window. */
export async function findActiveSessionDecision(input: {
  partnerId: string;
  subjectId: string;
  policyId: string;
}): Promise<ActiveSessionDecision | null> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await sb
    .from("verification_decisions")
    .select("id, valid_until, status")
    .eq("partner_id", input.partnerId)
    .eq("subject_id", input.subjectId)
    .eq("policy_id", input.policyId)
    .eq("status", "active")
    .is("request_id", null)
    .gt("valid_until", now)
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) return null;
  return toActiveSessionDecision(data.id as string, data.valid_until as string);
}

/** Complete-path idempotency — reuse decision issued for a verification request. */
export async function findDecisionByVerificationRequest(input: {
  verificationRequestId: string;
  subjectId: string;
}): Promise<ActiveSessionDecision | null> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("verification_decisions")
    .select("id, valid_until, status")
    .eq("request_id", input.verificationRequestId)
    .eq("subject_id", input.subjectId)
    .eq("status", "active")
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) return null;
  return toActiveSessionDecision(data.id as string, data.valid_until as string);
}

export async function findDecisionByIdempotencyKey(
  idempotencyKey: string,
): Promise<StoredPartnerFlowDecisionIdentity | null> {
  if (!await isVerificationDecisionIdempotencyKeyAvailable()) {
    return null;
  }

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from("verification_decisions")
    .select("id, partner_id, subject_id, policy_id, request_id, idempotency_key, valid_until, status")
    .eq("idempotency_key", idempotencyKey)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    if (isMissingIdempotencyKeyColumnError(error)) {
      markVerificationDecisionIdempotencyKeyAbsent();
      return null;
    }
    throw new Error(error.message);
  }
  if (!data?.id) return null;
  return mapDecisionIdentity(data as Record<string, unknown>);
}

/** Supersede prior active session decisions before issuing a refresh replacement. */
export async function supersedeActiveSessionDecisions(input: {
  partnerId: string;
  subjectId: string;
  policyId: string;
}): Promise<void> {
  const sb = requireSupabaseAdmin();
  const { error } = await sb
    .from("verification_decisions")
    .update({ status: "superseded" })
    .eq("partner_id", input.partnerId)
    .eq("subject_id", input.subjectId)
    .eq("policy_id", input.policyId)
    .eq("status", "active")
    .is("request_id", null);

  if (error) throw new Error(error.message);
}
