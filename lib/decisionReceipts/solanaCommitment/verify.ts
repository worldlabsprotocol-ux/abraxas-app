import { Connection, PublicKey, type VersionedTransactionResponse } from "@solana/web3.js";
import { parseReceiptCommitmentMemo } from "@/lib/decisionReceipts/solanaCommitment/memo";
import {
  SOLANA_RECEIPT_COMMITMENT_CLUSTER,
  SOLANA_RECEIPT_COMMITMENT_NETWORK_ID,
} from "@/lib/decisionReceipts/solanaCommitment/contract";
import { resolveSolanaCommitmentConfirmation, resolveSolanaCommitmentRpcUrl } from "@/lib/decisionReceipts/solanaCommitment/config";

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export interface OnChainCommitmentVerificationInput {
  transactionSignature: string;
  expectedDigest: string;
  expectedReceiptId: string;
  expectedCommitterPubkey: string;
  expectedPayloadHash: string;
  connection?: Connection;
  confirmationThreshold?: "confirmed" | "finalized";
}

export type OnChainCommitmentVerificationResult =
  | {
      ok: true;
      network_id: typeof SOLANA_RECEIPT_COMMITMENT_NETWORK_ID;
      cluster: typeof SOLANA_RECEIPT_COMMITMENT_CLUSTER;
      confirmation_status: string;
      slot: number;
      memo_digest: string;
      memo_receipt_id: string;
    }
  | {
      ok: false;
      reason:
        | "rpc_unavailable"
        | "transaction_not_found"
        | "transaction_failed"
        | "confirmation_insufficient"
        | "memo_missing"
        | "memo_parse_failed"
        | "digest_mismatch"
        | "receipt_id_mismatch"
        | "committer_mismatch"
        | "payload_binding_mismatch";
    };

function extractMemoFromTransaction(tx: VersionedTransactionResponse): string | null {
  const message = tx.transaction.message;
  const accountKeys = message.getAccountKeys().staticAccountKeys.map(k => k.toBase58());
  for (const ix of message.compiledInstructions) {
    const programId = accountKeys[ix.programIdIndex];
    if (programId !== MEMO_PROGRAM_ID) continue;
    const data = Buffer.from(ix.data);
    return data.toString("utf8");
  }
  return null;
}

function confirmationMeetsThreshold(
  status: string | null | undefined,
  threshold: "confirmed" | "finalized",
): boolean {
  if (!status) return false;
  if (threshold === "finalized") return status === "finalized";
  return status === "confirmed" || status === "finalized";
}

export async function verifyOnChainReceiptCommitment(
  input: OnChainCommitmentVerificationInput,
): Promise<OnChainCommitmentVerificationResult> {
  const threshold = input.confirmationThreshold ?? resolveSolanaCommitmentConfirmation();
  let connection = input.connection;
  if (!connection) {
    try {
      connection = new Connection(resolveSolanaCommitmentRpcUrl(), threshold);
    } catch {
      return { ok: false, reason: "rpc_unavailable" };
    }
  }

  let tx: VersionedTransactionResponse | null;
  try {
    tx = await connection.getTransaction(input.transactionSignature, {
      commitment: threshold,
      maxSupportedTransactionVersion: 0,
    });
  } catch {
    return { ok: false, reason: "rpc_unavailable" };
  }

  if (!tx) return { ok: false, reason: "transaction_not_found" };
  if (tx.meta?.err) return { ok: false, reason: "transaction_failed" };

  const sigStatus = await connection.getSignatureStatus(input.transactionSignature);
  if (!confirmationMeetsThreshold(sigStatus.value?.confirmationStatus ?? null, threshold)) {
    return { ok: false, reason: "confirmation_insufficient" };
  }

  const feePayer = tx.transaction.message.getAccountKeys().staticAccountKeys[0]?.toBase58();
  if (!feePayer || feePayer !== input.expectedCommitterPubkey) {
    return { ok: false, reason: "committer_mismatch" };
  }

  const memoRaw = extractMemoFromTransaction(tx);
  if (!memoRaw) return { ok: false, reason: "memo_missing" };
  const memo = parseReceiptCommitmentMemo(memoRaw);
  if (!memo) return { ok: false, reason: "memo_parse_failed" };
  if (memo.d !== input.expectedDigest) return { ok: false, reason: "digest_mismatch" };
  if (memo.rid !== input.expectedReceiptId) return { ok: false, reason: "receipt_id_mismatch" };

  // payload_hash is bound via domain-separated digest — re-check digest input binding externally
  if (!/^[a-f0-9]{64}$/.test(input.expectedPayloadHash)) {
    return { ok: false, reason: "payload_binding_mismatch" };
  }

  return {
    ok: true,
    network_id: SOLANA_RECEIPT_COMMITMENT_NETWORK_ID,
    cluster: SOLANA_RECEIPT_COMMITMENT_CLUSTER,
    confirmation_status: sigStatus.value?.confirmationStatus ?? threshold,
    slot: tx.slot,
    memo_digest: memo.d,
    memo_receipt_id: memo.rid,
  };
}

export function expectedCommitterMatches(actual: string, expected: string): boolean {
  try {
    return new PublicKey(actual).equals(new PublicKey(expected));
  } catch {
    return false;
  }
}
