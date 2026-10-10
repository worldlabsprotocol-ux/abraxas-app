import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildReceiptCommitmentDigest } from "@/lib/decisionReceipts/solanaCommitment/digest";
import {
  buildReceiptCommitmentMemo,
  serializeReceiptCommitmentMemo,
} from "@/lib/decisionReceipts/solanaCommitment/memo";
import {
  solanaReceiptCommitmentsEnabled,
  solanaExplorerTransactionUrl,
} from "@/lib/decisionReceipts/solanaCommitment/config";
import { loadSolanaReceiptCommitter } from "@/lib/decisionReceipts/solanaCommitment/signer";
import {
  getActiveCommitmentForReceipt,
  markCommitmentSuperseded,
  updateCommitment,
  upsertPendingCommitment,
} from "@/lib/decisionReceipts/solanaCommitment/store";
import { submitReceiptCommitmentMemo } from "@/lib/decisionReceipts/solanaCommitment/submit";
import {
  isSolanaNativeReceiptCommitmentPolicy,
  policyRequiresSolanaReceiptCommitment,
} from "@/lib/decisionReceipts/solanaCommitment/policy";
import type {
  SolanaReceiptCommitmentRecord,
  SolanaReceiptProvenanceView,
} from "@/lib/decisionReceipts/solanaCommitment/contract";
import { verifyOnChainReceiptCommitment } from "@/lib/decisionReceipts/solanaCommitment/verify";
import { isReceiptSuperseded } from "@/lib/decisionReceipts/receiptSupersession";

export function shouldEnqueueSolanaReceiptCommitment(record: DecisionReceiptRecord): boolean {
  if (!solanaReceiptCommitmentsEnabled()) return false;
  if (record.decision_result !== "approved") return false;
  if (record.status !== "active") return false;
  return isSolanaNativeReceiptCommitmentPolicy(record.policy_id);
}

export async function enqueueSolanaReceiptCommitment(
  record: DecisionReceiptRecord,
): Promise<SolanaReceiptCommitmentRecord | null> {
  if (!shouldEnqueueSolanaReceiptCommitment(record)) return null;

  const signer = loadSolanaReceiptCommitter();
  if (!signer.ok) {
    return null;
  }

  const digest = buildReceiptCommitmentDigest(record.payload_hash);
  const memo = serializeReceiptCommitmentMemo(
    buildReceiptCommitmentMemo({ commitmentDigest: digest }),
  );

  const row = await upsertPendingCommitment({
    receiptId: record.id,
    payloadHash: record.payload_hash,
    commitmentDigest: digest,
    committerPubkey: signer.committer.publicKey.toBase58(),
    memoPayload: memo,
    idempotencyKey: `rcpt:${record.id}`,
  });

  if (row.status === "CONFIRMED" && row.transaction_signature) {
    return row;
  }

  return processSolanaReceiptCommitment(record.id);
}

export async function processSolanaReceiptCommitment(
  receiptId: string,
): Promise<SolanaReceiptCommitmentRecord | null> {
  const record = await getActiveCommitmentForReceipt(receiptId);
  if (!record) return null;
  if (record.status === "CONFIRMED") return record;
  if (record.status === "SUPERSEDED") return record;

  const supersession = await isReceiptSuperseded(receiptId);
  if (supersession.superseded) {
    await markCommitmentSuperseded(receiptId);
    return getActiveCommitmentForReceipt(receiptId);
  }

  const signer = loadSolanaReceiptCommitter();
  if (!signer.ok) {
    await updateCommitment(record.id, {
      status: "FAILED",
      failure_class: "signer_unavailable",
      failure_detail: "committer_not_configured",
      submission_attempts: record.submission_attempts + 1,
    });
    return getActiveCommitmentForReceipt(receiptId);
  }

  if (!record.memo_payload) {
    await updateCommitment(record.id, {
      status: "FAILED",
      failure_class: "memo_parse_failed",
      failure_detail: "memo_missing",
    });
    return getActiveCommitmentForReceipt(receiptId);
  }

  await updateCommitment(record.id, {
    status: "SUBMITTED",
    submission_attempts: record.submission_attempts + 1,
    submitted_at: new Date().toISOString(),
    failure_class: null,
    failure_detail: null,
  });

  const submission = await submitReceiptCommitmentMemo({
    memo: record.memo_payload,
    committer: signer.committer,
  });

  if (!submission.ok) {
    const retryable =
      submission.failureClass === "rpc_unavailable"
      || submission.failureClass === "confirmation_timeout"
      || submission.failureClass === "broadcast_failed";
    await updateCommitment(record.id, {
      status: retryable ? "RETRYABLE" : "FAILED",
      failure_class: submission.failureClass,
      failure_detail: submission.detail,
    });
    return getActiveCommitmentForReceipt(receiptId);
  }

  await updateCommitment(record.id, {
    status: "CONFIRMED",
    transaction_signature: submission.signature,
    slot: submission.slot,
    confirmation_status: submission.confirmationStatus,
    confirmed_at: new Date().toISOString(),
    failure_class: null,
    failure_detail: null,
  });

  const confirmed = await getActiveCommitmentForReceipt(receiptId);
  if (confirmed?.transaction_signature) {
    const chain = await verifyOnChainReceiptCommitment({
      transactionSignature: confirmed.transaction_signature,
      expectedDigest: confirmed.commitment_digest,
      expectedReceiptId: confirmed.receipt_id,
      expectedCommitterPubkey: confirmed.committer_pubkey,
      expectedPayloadHash: confirmed.payload_hash,
    });
    if (!chain.ok) {
      await updateCommitment(confirmed.id, {
        status: "FAILED",
        failure_class: chain.reason === "digest_mismatch" ? "digest_mismatch" : "confirmation_failed",
        failure_detail: chain.reason,
      });
    }
  }

  return getActiveCommitmentForReceipt(receiptId);
}

export function toSolanaProvenanceView(input: {
  commitment: SolanaReceiptCommitmentRecord | null;
  policyId: string;
  requireOnChain: boolean;
}): SolanaReceiptProvenanceView {
  const commitmentRequired =
    input.requireOnChain && policyRequiresSolanaReceiptCommitment(input.policyId);

  if (!input.commitment) {
    return {
      network_id: "solana_devnet",
      cluster: "devnet",
      status: "none",
      proof_confirmed: false,
      commitment_required: commitmentRequired,
    };
  }

  const proofConfirmed = input.commitment.status === "CONFIRMED"
    && Boolean(input.commitment.transaction_signature);

  return {
    network_id: "solana_devnet",
    cluster: "devnet",
    status: input.commitment.status,
    proof_confirmed: proofConfirmed,
    commitment_required: commitmentRequired,
    transaction_signature: input.commitment.transaction_signature ?? undefined,
    committer_pubkey: input.commitment.committer_pubkey,
    confirmation_status: input.commitment.confirmation_status,
    failure_class: input.commitment.failure_class,
    explorer_url: input.commitment.transaction_signature
      ? solanaExplorerTransactionUrl("devnet", input.commitment.transaction_signature)
      : undefined,
  };
}
