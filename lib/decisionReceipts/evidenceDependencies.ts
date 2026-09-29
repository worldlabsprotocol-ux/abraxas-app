// FILE: lib/decisionReceipts/evidenceDependencies.ts
// Internal receipt ↔ reusable evidence dependency records. Never public.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { InternalReusableFact } from "@/lib/passport/reusableEligibility/contract";

export type EvidenceDependencyType = "reusable_fact" | "source_receipt" | "derived_from";

export interface ReceiptEvidenceDependency {
  id: string;
  receipt_id: string;
  fact_id: string | null;
  source_credential_id: string | null;
  dependency_type: EvidenceDependencyType;
  created_at: string;
}

export async function recordReceiptEvidenceDependencies(input: {
  receiptId: string;
  fact: InternalReusableFact;
}): Promise<void> {
  const sb = requireSupabaseAdmin();
  const rows = [
    {
      receipt_id: input.receiptId,
      fact_id: input.fact.fact_id,
      source_credential_id: input.fact.source_receipt_id,
      dependency_type: "reusable_fact" as const,
    },
    {
      receipt_id: input.receiptId,
      fact_id: input.fact.fact_id,
      source_credential_id: input.fact.source_receipt_id,
      dependency_type: "source_receipt" as const,
    },
  ];
  if (input.fact.derived_from_fact_id) {
    rows.push({
      receipt_id: input.receiptId,
      fact_id: input.fact.derived_from_fact_id,
      source_credential_id: null,
      dependency_type: "derived_from" as const,
    });
  }

  const { error } = await sb.from("decision_receipt_evidence_dependencies").upsert(rows, {
    onConflict: "receipt_id,dependency_type",
    ignoreDuplicates: true,
  });
  if (error && !/does not exist|schema/i.test(error.message)) {
    console.error("[decision_receipt_evidence_dependencies]", error.message);
  }
}

export async function getReceiptEvidenceDependencies(receiptId: string): Promise<ReceiptEvidenceDependency[]> {
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
  } catch {
    return [];
  }
  if (error) {
    if (/does not exist|schema/i.test(error.message)) return [];
    return [];
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
