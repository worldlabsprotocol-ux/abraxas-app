// FILE: lib/decisionReceipts/dependencies.ts
// Record claim dependencies for decision receipts at issuance time.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import type { EvaluatedClaimRef } from "@/lib/decisionReceipts/types";

export async function recordReceiptClaimDependencies(
  receiptId: string,
  claimRefs: EvaluatedClaimRef[],
  signingKeyIds?: Record<string, string | undefined>,
  transaction?: { query: (sql: string, params: unknown[]) => Promise<unknown> },
): Promise<void> {
  if (!claimRefs.length) return;
  if (persistenceUsesDirectPostgres()) {
    if (!transaction) throw new Error("receipt_dependency_transaction_required");
    for (const ref of claimRefs) {
      const sql =
        `insert into public.receipt_claim_dependencies
           (receipt_id, claim_id, claim_type, issuer_id, signing_key_id)
         values ($1, $2::uuid, $3, $4, $5)
         on conflict (receipt_id, claim_id) do nothing`;
      const params = [receiptId, ref.claim_id, ref.claim_type, ref.issuer_id,
        signingKeyIds?.[ref.claim_id] ?? null];
      await transaction.query(sql, params);
    }
    return;
  }
  const sb = requireSupabaseAdmin();
  const rows = claimRefs.map(ref => ({
    receipt_id: receiptId,
    claim_id: ref.claim_id,
    claim_type: ref.claim_type,
    issuer_id: ref.issuer_id,
    signing_key_id: signingKeyIds?.[ref.claim_id] ?? null,
  }));

  const { error } = await sb.from("receipt_claim_dependencies").upsert(rows, {
    onConflict: "receipt_id,claim_id",
    ignoreDuplicates: true,
  });

  if (error) console.error("[receipt_claim_dependencies]", error.message);
}

export async function getReceiptDependencies(receiptId: string) {
  if (persistenceUsesDirectPostgres()) {
    const { rows } = await queryAbraxasPg<{
      claim_id: string; claim_type: string; issuer_id: string;
      signing_key_id: string | null; created_at: string;
    }>(
      `select claim_id, claim_type, issuer_id, signing_key_id, created_at
       from public.receipt_claim_dependencies where receipt_id = $1
       order by created_at asc`,
      [receiptId],
    );
    return rows;
  }
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("receipt_claim_dependencies")
    .select("*")
    .eq("receipt_id", receiptId)
    .order("created_at", { ascending: true });
  return data ?? [];
}
