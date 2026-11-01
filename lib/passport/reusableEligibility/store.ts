// FILE: lib/passport/reusableEligibility/store.ts
// Persist facts and derivations. Fail closed when lifecycle storage is unavailable.

import { requireSupabaseAdmin, SupabaseAdminConfigurationError } from "@/lib/supabase/admin";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { projectInternalFact, type SourceReceiptRow } from "./facts";
import type { InternalReusableFact } from "./contract";

type PgTransaction = { query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

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
  if (persistenceUsesDirectPostgres()) {
    const { rows } = await queryAbraxasPg<Record<string, unknown>>(
      `select r.id, r.verification_decision_id::text, r.partner_id, r.policy_id,
              r.policy_version, r.subject_pseudonym_id, r.decision_result,
              r.decision_context, r.evaluated_at, r.expires_at, r.revoked_at, r.status
       from public.decision_receipts r
       join public.verification_decisions d on d.id = r.verification_decision_id
       join public.consent_receipts c on c.id = r.consent_receipt_id
       where d.subject_id = $1 and d.status = 'active' and c.subject_id = $1
         and c.revoked_at is null and r.decision_result = 'approved'
         and r.status = 'active' and r.revoked_at is null
         and (r.expires_at is null or r.expires_at > now())
       order by r.evaluated_at desc limit 40`,
      [subjectId],
    );
    return rows.map(mapReceipt).filter((row) => row.id);
  }
  const sb = requireSupabaseAdmin();
  const { data: decisions, error: decisionError } = await sb
    .from("verification_decisions")
    .select("id")
    .eq("subject_id", subjectId);
  if (decisionError) throw new Error("unavailable");

  const decisionIds = (decisions ?? []).map((row) => row.id as string).filter(Boolean);
  if (!decisionIds.length) return [];

  const { data, error } = await sb
    .from("decision_receipts")
    .select("id, verification_decision_id, partner_id, policy_id, policy_version, subject_pseudonym_id, decision_result, decision_context, evaluated_at, expires_at, revoked_at, status")
    .in("verification_decision_id", decisionIds)
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

export async function upsertReusableFact(fact: InternalReusableFact, transaction?: PgTransaction): Promise<void> {
  if (persistenceUsesDirectPostgres()) {
    const query = transaction ? transaction.query.bind(transaction) : queryAbraxasPg;
    await query(
      `insert into public.reusable_eligibility_facts
        (id, subject_pseudonym_id, pack_id, policy_version, minimum_assurance,
         result_category, decision_context, source_decision_id, source_receipt_id,
         issued_at, expires_at, revoked_at, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8::uuid,$9,$10::timestamptz,$11::timestamptz,$12::timestamptz,$13)
       on conflict (id) do nothing`,
      [fact.fact_id, fact.subject_pseudonym_id, fact.pack_id, fact.policy_version,
        fact.minimum_assurance, fact.result_category, fact.decision_context,
        fact.source_decision_id, fact.source_receipt_id, fact.issued_at, fact.expires_at,
        fact.status === "revoked" ? new Date().toISOString() : null, fact.status],
    );
    const existing = await query(
      `select source_decision_id::text, source_receipt_id, subject_pseudonym_id, status,
              revoked_at from public.reusable_eligibility_facts where id = $1 for update`,
      [fact.fact_id],
    );
    const row = existing.rows[0];
    if (!row || row.source_decision_id !== fact.source_decision_id
      || row.source_receipt_id !== fact.source_receipt_id
      || row.subject_pseudonym_id !== fact.subject_pseudonym_id
      || row.status !== "active" || row.revoked_at) {
      throw new Error("reusable_fact_not_current");
    }
    return;
  }
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
}, transaction?: PgTransaction): Promise<void> {
  if (persistenceUsesDirectPostgres()) {
    if (!transaction) throw new Error("reusable_derivation_transaction_required");
    await upsertReusableFact(input.fact, transaction);
    const inserted = await transaction.query(
      `insert into public.reusable_eligibility_derivations
        (fact_id, source_receipt_id, derived_receipt_id, derived_decision_id,
         requesting_partner_id, requesting_policy_id, requesting_policy_version, verify_request_id)
       values ($1,$2,$3,$4::uuid,$5,$6,$7,$8)
       on conflict (derived_receipt_id) do nothing returning derived_receipt_id`,
      [input.fact.fact_id, input.fact.source_receipt_id, input.derivedReceiptId,
        input.derivedDecisionId, input.requestingPartnerId, input.requestingPolicyId,
        input.requestingPolicyVersion, input.verifyRequestId],
    );
    if (inserted.rows[0]?.derived_receipt_id !== input.derivedReceiptId) {
      throw new Error("reusable_derivation_conflict");
    }
    return;
  }
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
  if (persistenceUsesDirectPostgres()) {
    try {
      const { rows } = await queryAbraxasPg<{ result: { ok?: boolean } | null }>(
        `select public.revoke_derived_receipts_for_source($1, $2, $3) as result`,
        [input.sourceReceiptId, input.reasonCode, input.changedBy],
      );
      return rows[0]?.result?.ok === true ? { ok: true } : { ok: false, error: "unavailable" };
    } catch {
      return { ok: false, error: "unavailable" };
    }
  }
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
