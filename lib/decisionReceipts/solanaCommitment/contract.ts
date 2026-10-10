// Solana receipt commitment provenance — devnet memo commitments (Build #509).

export const SOLANA_RECEIPT_COMMITMENT_PROTOCOL = "abx-rcpt" as const;
export const SOLANA_RECEIPT_COMMITMENT_MEMO_VERSION = 2 as const;
export const SOLANA_RECEIPT_COMMITMENT_NETWORK_ID = "solana_devnet" as const;
export const SOLANA_RECEIPT_COMMITMENT_CLUSTER = "devnet" as const;

export const SOLANA_RECEIPT_COMMITMENT_STATUSES = [
  "PENDING",
  "SUBMITTED",
  "CONFIRMED",
  "FAILED",
  "RETRYABLE",
  "SUPERSEDED",
] as const;

export type SolanaReceiptCommitmentStatus = (typeof SOLANA_RECEIPT_COMMITMENT_STATUSES)[number];

export type SolanaReceiptCommitmentFailureClass =
  | "signer_unavailable"
  | "rpc_unavailable"
  | "insufficient_funds"
  | "simulation_failed"
  | "broadcast_failed"
  | "confirmation_timeout"
  | "confirmation_failed"
  | "digest_mismatch"
  | "memo_parse_failed"
  | "committer_mismatch"
  | "policy_not_eligible"
  | "feature_disabled";

export interface SolanaReceiptCommitmentRecord {
  id: string;
  receipt_id: string;
  cluster: typeof SOLANA_RECEIPT_COMMITMENT_CLUSTER;
  network_id: typeof SOLANA_RECEIPT_COMMITMENT_NETWORK_ID;
  status: SolanaReceiptCommitmentStatus;
  commitment_digest: string;
  payload_hash: string;
  committer_pubkey: string;
  memo_payload: string | null;
  transaction_signature: string | null;
  slot: number | null;
  confirmation_status: string | null;
  failure_class: SolanaReceiptCommitmentFailureClass | null;
  failure_detail: string | null;
  submission_attempts: number;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  confirmed_at: string | null;
  superseded_at: string | null;
}

/** Holder/partner-safe provenance summary (no wallet identity, no raw memo). */
export interface SolanaReceiptProvenanceView {
  network_id: typeof SOLANA_RECEIPT_COMMITMENT_NETWORK_ID;
  cluster: typeof SOLANA_RECEIPT_COMMITMENT_CLUSTER;
  status: SolanaReceiptCommitmentStatus | "none";
  proof_confirmed: boolean;
  commitment_required: boolean;
  explorer_url?: string;
  transaction_signature?: string;
  committer_pubkey?: string;
  confirmation_status?: string | null;
  failure_class?: SolanaReceiptCommitmentFailureClass | null;
}

export interface SolanaCommitmentTrustResult {
  on_chain_required: boolean;
  on_chain_confirmed: boolean;
  commitment_status: SolanaReceiptCommitmentStatus | "none";
  invalidation_reasons: string[];
}
