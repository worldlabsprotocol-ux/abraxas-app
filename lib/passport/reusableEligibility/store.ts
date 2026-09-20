// FILE: lib/passport/reusableEligibility/store.ts
// Persist facts and derivations. Fail closed when lifecycle storage is unavailable.

import { requireSupabaseAdmin, SupabaseAdminConfigurationError } from "@/lib/supabase/admin";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { projectInternalFact, type SourceReceiptRow } from "./facts";
import type { InternalReusableFact } from "./contract";

function mapReceipt(row: Record<string, unknown>): SourceReceiptRow {
  return {
    id: String(row.id ?? ""),
    verification_decision_id: String(row.verification_decision_id ?? ""),
    partner_id: String(row.partner_id ?? ""),
    policy_id: String(row.policy_id ?? ""),
    policy_version: Number(row.policy_version ?? 1),
    subject_pseudonym_id: String(row.subject_pseudonym_id ?? ""),
    decision_result: String(row.decision_result ?? ""),
    decision_context: String(row.decision_context ?? "production"),
    evaluated_at: String(row.evaluated_at ?? ""),
    expires_at: (row.expires_at as string | null) ?? null,
    revoked_at: (row.revoked_at as string | null) ?? null,
    status: String(row.status ?? "active"),
  };
}

export async function listHolderSourceReceipts(subjectId: string): Promise<SourceReceiptRow[]> {
  const sb = requireSupabaseAdmin();
  const pseudonym = subjectPseudonymId(subjectId);
  const { data, error } = await sb
    .from("decision_receipts")
    .select("id, verification_decision_id, partner_id, policy_id, policy_version, subject_pseudonym_id, decision_result, decision_context, evaluated_at, expires_at, revoked_at, status")
    .eq("subject_pseudonym_id", pseudonym)
    .eq("decision_result", "approved")
    .order("evaluated_at", { ascending: false })
    .limit(40);
  if (error) throw new Error("unavailable");
  return (data ?? []).map((row) => mapReceipt(row as Record<string, unknown>)).filter((row) => row.id);
}

export async function listHolderFacts(subjectId: string, now = new Date()): Promise<InternalReusableFact[]> {
  const receipts = await listHolderSourceReceipts(subjectId);
  return receipts
    .map((receipt) => projectInternalFact({ subjectId, receipt, now }))
    .filter((fact): fact is InternalReusableFact => fact !== null);
}

export async function upsertReusableFact(fact: InternalReusableFact): Promise<void> {
  const sb = requireSupabaseAdmin();
  const { error } = await sb.from("reusable_eligibility_facts").upsert({
    id: fact.fact_id,
    subject_pseudonym_id: fact.subject_pseudonym_id,
    pack_id: fact.pack_id,
    policy_version: fact.policy_version,
    minimum_assurance: fact.minimum_assurance,
    result_category: fact.result_category,
    decision_context: fact.decision_context,
    source_decision_id: fact.source_decision_id,
    source_receipt_id: fact.source_receipt_id,
    issued_at: fact.issued_at,
    expires_at: fact.expires_at,
    revoked_at: fact.status === "revoked" ? new Date().toISOString() : null,
    status: fact.status,
  }, { onConflict: "id" });
  if (error) throw new Error("unavailable");
}

export async function recordDerivation(input: {
  fact: InternalReusableFact;
  derivedReceiptId: string;
  derivedDecisionId: string;
  requestingPartnerId: string;
  requestingPolicyId: string;
  requestingPolicyVersion: number;
  verifyRequestId: string;
}): Promise<void> {
  const sb = requireSupabaseAdmin();
  await upsertReusableFact(input.fact);
  const { error } = await sb.from("reusable_eligibility_derivations").insert({
    fact_id: input.fact.fact_id,
    source_receipt_id: input.fact.source_receipt_id,
    derived_receipt_id: input.derivedReceiptId,
    derived_decision_id: input.derivedDecisionId,
    requesting_partner_id: input.requestingPartnerId,
    requesting_policy_id: input.requestingPolicyId,
    requesting_policy_version: input.requestingPolicyVersion,
    verify_request_id: input.verifyRequestId,
  });
  if (error && !/duplicate|unique/i.test(error.message)) throw new Error("unavailable");
}

export async function revokeDerivedFromSourceReceipt(input: {
  sourceReceiptId: string;
  changedBy: string;
  reasonCode: string;
}): Promise<{ ok: true } | { ok: false; error: "unavailable" }> {
  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.rpc("revoke_derived_receipts_for_source", {
      p_source_receipt_id: input.sourceReceiptId,
      p_reason_code: input.reasonCode,
      p_changed_by: input.changedBy,
    });
    if (error) return { ok: false, error: "unavailable" };
    return { ok: true };
  } catch (error) {
    if (error instanceof SupabaseAdminConfigurationError) return { ok: false, error: "unavailable" };
    return { ok: false, error: "unavailable" };
  }
}

export { SupabaseAdminConfigurationError };
