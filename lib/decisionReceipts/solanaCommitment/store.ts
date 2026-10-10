import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  SolanaReceiptCommitmentFailureClass,
  SolanaReceiptCommitmentRecord,
  SolanaReceiptCommitmentStatus,
} from "@/lib/decisionReceipts/solanaCommitment/contract";
import { SOLANA_RECEIPT_COMMITMENT_CLUSTER, SOLANA_RECEIPT_COMMITMENT_NETWORK_ID } from "@/lib/decisionReceipts/solanaCommitment/contract";

function mapRow(row: Record<string, unknown>): SolanaReceiptCommitmentRecord {
  return {
    id: String(row.id),
    receipt_id: String(row.receipt_id),
    cluster: SOLANA_RECEIPT_COMMITMENT_CLUSTER,
    network_id: SOLANA_RECEIPT_COMMITMENT_NETWORK_ID,
    status: row.status as SolanaReceiptCommitmentStatus,
    commitment_digest: String(row.commitment_digest),
    payload_hash: String(row.payload_hash),
    committer_pubkey: String(row.committer_pubkey),
    memo_payload: (row.memo_payload as string | null) ?? null,
    transaction_signature: (row.transaction_signature as string | null) ?? null,
    slot: row.slot == null ? null : Number(row.slot),
    confirmation_status: (row.confirmation_status as string | null) ?? null,
    failure_class: (row.failure_class as SolanaReceiptCommitmentFailureClass | null) ?? null,
    failure_detail: (row.failure_detail as string | null) ?? null,
    submission_attempts: Number(row.submission_attempts ?? 0),
    idempotency_key: String(row.idempotency_key),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    submitted_at: (row.submitted_at as string | null) ?? null,
    confirmed_at: (row.confirmed_at as string | null) ?? null,
    superseded_at: (row.superseded_at as string | null) ?? null,
  };
}

export async function getActiveCommitmentForReceipt(
  receiptId: string,
): Promise<SolanaReceiptCommitmentRecord | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("decision_receipt_solana_commitments")
    .select("*")
    .eq("receipt_id", receiptId)
    .is("superseded_at", null)
    .neq("status", "SUPERSEDED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function upsertPendingCommitment(input: {
  receiptId: string;
  payloadHash: string;
  commitmentDigest: string;
  committerPubkey: string;
  memoPayload: string;
  idempotencyKey: string;
}): Promise<SolanaReceiptCommitmentRecord> {
  const sb = requireSupabaseAdmin();
  const existing = await getActiveCommitmentForReceipt(input.receiptId);
  if (existing) return existing;

  const { data, error } = await sb
    .from("decision_receipt_solana_commitments")
    .insert({
      receipt_id: input.receiptId,
      cluster: SOLANA_RECEIPT_COMMITMENT_CLUSTER,
      network_id: SOLANA_RECEIPT_COMMITMENT_NETWORK_ID,
      status: "PENDING",
      commitment_digest: input.commitmentDigest,
      payload_hash: input.payloadHash,
      committer_pubkey: input.committerPubkey,
      memo_payload: input.memoPayload,
      idempotency_key: input.idempotencyKey,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const retry = await getActiveCommitmentForReceipt(input.receiptId);
      if (retry) return retry;
    }
    throw new Error(error.message);
  }
  return mapRow(data as Record<string, unknown>);
}

export async function updateCommitment(
  id: string,
  patch: Partial<{
    status: SolanaReceiptCommitmentStatus;
    transaction_signature: string | null;
    slot: number | null;
    confirmation_status: string | null;
    failure_class: SolanaReceiptCommitmentFailureClass | null;
    failure_detail: string | null;
    submission_attempts: number;
    submitted_at: string | null;
    confirmed_at: string | null;
    superseded_at: string | null;
  }>,
): Promise<void> {
  const sb = requireSupabaseAdmin();
  const { error } = await sb
    .from("decision_receipt_solana_commitments")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markCommitmentSuperseded(receiptId: string): Promise<void> {
  const row = await getActiveCommitmentForReceipt(receiptId);
  if (!row || row.status === "SUPERSEDED") return;
  await updateCommitment(row.id, {
    status: "SUPERSEDED",
    superseded_at: new Date().toISOString(),
  });
}
