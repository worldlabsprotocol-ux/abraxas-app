// FILE: lib/partner/sessionDecision.ts
// Idempotent session decision lookup — reuse active decision within TTL.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getReceiptByDecisionId } from "@/lib/decisionReceipts/service";

export interface ActiveSessionDecision {
  decision_id: string;
  receipt_id: string;
  receipt_expires_at: string;
}

/** Find reusable session decision for partner+subject+policy within valid_until window. */
export async function findActiveSessionDecision(input: {
  partnerId: string;
  subjectId: string;
  policyId: string;
}): Promise<ActiveSessionDecision | null> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();

  const { data } = await sb
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

  if (!data?.id) return null;

  const receipt = await getReceiptByDecisionId(data.id as string);
  if (!receipt) return null;

  return {
    decision_id: data.id as string,
    receipt_id: receipt.id,
    receipt_expires_at: data.valid_until as string,
  };
}
