// FILE: lib/decisionReceipts/evidenceDependencies.ts
// Internal receipt ↔ reusable evidence dependency records. Never public.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import type { InternalReusableFact } from "@/lib/passport/reusableEligibility/contract";
import { getDerivationByDerivedReceipt } from "@/lib/passport/reusableEligibility/invalidation";

export type EvidenceDependencyType = "reusable_fact" | "source_receipt" | "derived_from";

/** Thrown when the evidence dependency store is unavailable (missing table or query failure). */
export class EvidenceDependencyStoreUnavailableError extends Error {
  readonly code = "evidence_dependency_store_unavailable" as const;

  constructor(message = "evidence_dependency_store_unavailable") {
    super(message);
    this.name = "EvidenceDependencyStoreUnavailableError";
  }
}

/** Row shape for inserts. Matches migration 113 nullability. */
export interface EvidenceDependencyInsertRow {
  receipt_id: string;
  fact_id: string;
  /** Source receipt/credential id when the dependency is receipt-backed; null for fact-only links. */
  source_credential_id: string | null;
  dependency_type: EvidenceDependencyType;
}

export interface ReceiptEvidenceDependency {
  id: string;
  receipt_id: string;
  fact_id: string | null;
  source_credential_id: string | null;
  dependency_type: EvidenceDependencyType;
  created_at: string;
}

function isSchemaUnavailableMessage(message: string): boolean {
  return /does not exist|schema cache|relation .* does not exist/i.test(message);
}

/** Reuse-derived receipts must have persisted dependency rows before authorization. */
export async function receiptRequiresEvidenceDependencyGraph(receiptId: string): Promise<boolean> {
  const derivation = await getDerivationByDerivedReceipt(receiptId);
  return derivation !== null;
}

export async function recordReceiptEvidenceDependencies(input: {
  receiptId: string;
  fact: InternalReusableFact;
}, transaction?: { query: (sql: string, params: unknown[]) => Promise<unknown> }): Promise<{ ok: true } | { ok: false; reason: string }> {
  const rows: EvidenceDependencyInsertRow[] = [
    {
      receipt_id: input.receiptId,
      fact_id: input.fact.fact_id,
      source_credential_id: input.fact.source_receipt_id,
      dependency_type: "reusable_fact",
    },
    {
      receipt_id: input.receiptId,
      fact_id: input.fact.fact_id,
      source_credential_id: input.fact.source_receipt_id,
      dependency_type: "source_receipt",
    },
  ];
  if (input.fact.derived_from_fact_id) {
    rows.push({
      receipt_id: input.receiptId,
      fact_id: input.fact.derived_from_fact_id,
      source_credential_id: null,
      dependency_type: "derived_from",
    });
  }

  if (persistenceUsesDirectPostgres()) {
    if (!transaction) throw new Error("evidence_dependency_transaction_required");
    for (const row of rows) {
      await transaction.query(
        `insert into public.decision_receipt_evidence_dependencies
          (receipt_id, fact_id, source_credential_id, dependency_type)
         values ($1,$2,$3,$4)`,
        [row.receipt_id, row.fact_id, row.source_credential_id, row.dependency_type],
      );
    }
    return { ok: true };
  }

  const sb = requireSupabaseAdmin();

  const { error } = await sb.from("decision_receipt_evidence_dependencies").upsert(rows, {
    onConflict: "receipt_id,dependency_type",
    ignoreDuplicates: true,
  });
  if (error) {
    if (isSchemaUnavailableMessage(error.message)) {
      return { ok: false, reason: "schema_unavailable" };
    }
    console.error("[decision_receipt_evidence_dependencies]", error.message);
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

export async function getReceiptEvidenceDependencies(receiptId: string): Promise<ReceiptEvidenceDependency[]> {
  if (persistenceUsesDirectPostgres()) {
    try {
      const { rows } = await queryAbraxasPg<ReceiptEvidenceDependency>(
        `select id::text, receipt_id, fact_id::text, source_credential_id,
                dependency_type, created_at
         from public.decision_receipt_evidence_dependencies
         where receipt_id = $1 order by created_at asc`,
        [receiptId],
      );
      return rows;
    } catch {
      throw new EvidenceDependencyStoreUnavailableError();
    }
  }
  const sb = requireSupabaseAdmin();
  let data: Record<string, unknown>[] | null = null;
  let error: { message: string } | null = null;
  try {
    const result = await sb
      .from("decision_receipt_evidence_dependencies")
      .select("id, receipt_id, fact_id, source_credential_id, dependency_type, created_at")
      .eq("receipt_id", receiptId)
      .order("created_at", { ascending: true });
    data = result.data as Record<string, unknown>[] | null;
    error = result.error;
  } catch (err) {
    throw new EvidenceDependencyStoreUnavailableError(
      err instanceof Error ? err.message : "evidence_dependency_store_unavailable",
    );
  }
  if (error) {
    if (isSchemaUnavailableMessage(error.message)) {
      throw new EvidenceDependencyStoreUnavailableError(error.message);
    }
    throw new EvidenceDependencyStoreUnavailableError(error.message);
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    receipt_id: String(row.receipt_id),
    fact_id: (row.fact_id as string | null) ?? null,
    source_credential_id: (row.source_credential_id as string | null) ?? null,
    dependency_type: row.dependency_type as EvidenceDependencyType,
    created_at: String(row.created_at),
  }));
}
