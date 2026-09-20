// FILE: lib/passport/verificationActivity/load.ts
// Subject-scoped load from existing decisions, requests, and receipts.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  PASSPORT_ACTIVITY_LIMIT,
  PASSPORT_ACTIVITY_WINDOW_DAYS,
} from "./contract";
import {
  buildPassportActivityView,
  type PassportActivitySourceRow,
  type PassportActivityView,
} from "./view";

export async function loadPassportVerificationActivity(subjectId: string): Promise<PassportActivityView> {
  const sb = requireSupabaseAdmin();
  const since = new Date(Date.now() - PASSPORT_ACTIVITY_WINDOW_DAYS * 86400_000).toISOString();
  const fetchLimit = PASSPORT_ACTIVITY_LIMIT * 2;

  const { data: decisions, error } = await sb
    .from("verification_decisions")
    .select("id, partner_id, policy_id, policy_version, decision, decided_at, valid_until, status, request_id")
    .eq("subject_id", subjectId)
    .gte("decided_at", since)
    .order("decided_at", { ascending: false })
    .limit(fetchLimit);

  if (error) throw new Error("unavailable");

  const rows = (decisions ?? []) as Array<Record<string, unknown>>;
  const decisionIds = rows.map((row) => String(row.id ?? "")).filter(Boolean);
  const requestIds = rows.map((row) => String(row.request_id ?? "")).filter(Boolean);

  const receiptsByDecision = new Map<string, Record<string, unknown>>();
  if (decisionIds.length) {
    const { data: receipts, error: receiptError } = await sb
      .from("decision_receipts")
      .select("verification_decision_id, status, decision_context, expires_at, revoked_at")
      .in("verification_decision_id", decisionIds);
    if (!receiptError) {
      for (const receipt of receipts ?? []) {
        const key = String((receipt as { verification_decision_id?: string }).verification_decision_id ?? "");
        if (key) receiptsByDecision.set(key, receipt as Record<string, unknown>);
      }
    }
  }

  const purposeByRequest = new Map<string, string | null>();
  if (requestIds.length) {
    const { data: requests, error: requestError } = await sb
      .from("verification_requests")
      .select("id, requested_action")
      .in("id", requestIds);
    if (!requestError) {
      for (const request of requests ?? []) {
        const rec = request as { id?: string; requested_action?: string | null };
        if (rec.id) purposeByRequest.set(rec.id, rec.requested_action ?? null);
      }
    }
  }

  const source: PassportActivitySourceRow[] = rows.map((row) => {
    const id = String(row.id ?? "");
    const receipt = receiptsByDecision.get(id);
    const requestId = String(row.request_id ?? "");
    return {
      decision_id: id,
      partner_id: String(row.partner_id ?? ""),
      policy_id: String(row.policy_id ?? ""),
      policy_version: Number(row.policy_version ?? 1),
      decision: String(row.decision ?? ""),
      decided_at: String(row.decided_at ?? ""),
      valid_until: (row.valid_until as string | null) ?? null,
      decision_status: String(row.status ?? "active"),
      requested_action: purposeByRequest.get(requestId) ?? null,
      receipt_status: receipt ? String(receipt.status ?? "") : null,
      receipt_context: receipt ? String(receipt.decision_context ?? "") : null,
      receipt_expires_at: receipt ? ((receipt.expires_at as string | null) ?? null) : null,
      receipt_revoked_at: receipt ? ((receipt.revoked_at as string | null) ?? null) : null,
    };
  });

  return buildPassportActivityView({ subjectId, rows: source });
}
