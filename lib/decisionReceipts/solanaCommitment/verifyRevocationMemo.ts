import { Connection, type VersionedTransactionResponse } from "@solana/web3.js";
import {
  parseRevocationMemo,
  verifyRevocationMemoFields,
  type ParsedRevocationMemo,
} from "@/lib/decisionReceipts/solanaCommitment/revocationMemo";
import { SOLANA_RECEIPT_COMMITMENT_CLUSTER, SOLANA_RECEIPT_COMMITMENT_NETWORK_ID } from "@/lib/decisionReceipts/solanaCommitment/contract";

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export type OnChainRevocationVerificationInput = {
  transactionSignature: string;
  targetCommitmentDigest: string;
  policyCommitmentHash: string;
  authorizedRevokerPubkeys: string[];
  connection?: Connection;
  confirmationThreshold?: "confirmed" | "finalized";
};

export type OnChainRevocationVerificationResult =
  | {
      ok: true;
      network_id: typeof SOLANA_RECEIPT_COMMITMENT_NETWORK_ID;
      cluster: typeof SOLANA_RECEIPT_COMMITMENT_CLUSTER;
      confirmation_status: string;
      slot: number;
      memo: ParsedRevocationMemo;
      revoker_pubkey: string;
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
        | "memo_fields_invalid"
        | "unauthorized_revoker"
        | "target_digest_mismatch";
    };

function extractMemoFromTransaction(tx: VersionedTransactionResponse): string | null {
  const message = tx.transaction.message;
  const accountKeys = message.getAccountKeys().staticAccountKeys.map(k => k.toBase58());
  for (const ix of message.compiledInstructions) {
    const programId = accountKeys[ix.programIdIndex];
    if (programId !== MEMO_PROGRAM_ID) continue;
    return Buffer.from(ix.data).toString("utf8");
  }
  return null;
}

function confirmationMeetsThreshold(status: string | null | undefined, threshold: "confirmed" | "finalized"): boolean {
  if (!status) return false;
  if (threshold === "finalized") return status === "finalized";
  return status === "confirmed" || status === "finalized";
}

export async function verifyOnChainRevocationMemo(
  input: OnChainRevocationVerificationInput,
): Promise<OnChainRevocationVerificationResult> {
  const threshold = input.confirmationThreshold ?? "finalized";
  let connection = input.connection;
  if (!connection) {
    return { ok: false, reason: "rpc_unavailable" };
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
  if (!feePayer || !input.authorizedRevokerPubkeys.includes(feePayer)) {
    return { ok: false, reason: "unauthorized_revoker" };
  }

  const memoRaw = extractMemoFromTransaction(tx);
  if (!memoRaw) return { ok: false, reason: "memo_missing" };
  const memo = parseRevocationMemo(memoRaw);
  if (!memo) return { ok: false, reason: "memo_parse_failed" };
  if (!verifyRevocationMemoFields(memo, {
    targetCommitmentDigest: input.targetCommitmentDigest,
    policyCommitmentHash: input.policyCommitmentHash,
  })) {
    return { ok: false, reason: "memo_fields_invalid" };
  }

  return {
    ok: true,
    network_id: SOLANA_RECEIPT_COMMITMENT_NETWORK_ID,
    cluster: SOLANA_RECEIPT_COMMITMENT_CLUSTER,
    confirmation_status: sigStatus.value?.confirmationStatus ?? threshold,
    slot: tx.slot,
    memo,
    revoker_pubkey: feePayer,
  };
}
