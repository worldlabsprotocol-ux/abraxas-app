// FILE: lib/decisionReceipts/dependencies.ts
// Record claim dependencies for decision receipts at issuance time.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { EvaluatedClaimRef } from "@/lib/decisionReceipts/types";

export async function recordReceiptClaimDependencies(
  receiptId: string,
  claimRefs: EvaluatedClaimRef[],
  signingKeyIds?: Record<string, string | undefined>,
): Promise<void> {
  if (!claimRefs.length) return;
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
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("receipt_claim_dependencies")
    .select("*")
    .eq("receipt_id", receiptId)
    .order("created_at", { ascending: true });
  return data ?? [];
}
