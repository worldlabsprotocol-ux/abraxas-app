import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  resolveSolanaCommitmentConfirmation,
  resolveSolanaCommitmentRpcUrl,
} from "@/lib/decisionReceipts/solanaCommitment/config";
import type { SolanaReceiptCommitter } from "@/lib/decisionReceipts/solanaCommitment/signer";
import type { SolanaReceiptCommitmentFailureClass } from "@/lib/decisionReceipts/solanaCommitment/contract";

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export type CommitmentSubmissionResult =
  | {
      ok: true;
      signature: string;
      slot: number;
      confirmationStatus: string;
    }
  | {
      ok: false;
      failureClass: SolanaReceiptCommitmentFailureClass;
      detail: string;
    };

function memoInstruction(text: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(text, "utf-8"),
  });
}

export async function submitReceiptCommitmentMemo(input: {
  memo: string;
  committer: SolanaReceiptCommitter;
  connection?: Connection;
}): Promise<CommitmentSubmissionResult> {
  const rpc = resolveSolanaCommitmentRpcUrl();
  let connection = input.connection;
  if (!connection) {
    try {
      connection = new Connection(rpc, resolveSolanaCommitmentConfirmation());
    } catch {
      return { ok: false, failureClass: "rpc_unavailable", detail: "connection_init_failed" };
    }
  }

  const { committer } = input;
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = committer.publicKey;
    tx.add(memoInstruction(input.memo, committer.publicKey));
    tx.sign(committer.keypair);

    const simulation = await connection.simulateTransaction(tx);
    if (simulation.value.err) {
      const detail = JSON.stringify(simulation.value.err);
      const failureClass: SolanaReceiptCommitmentFailureClass = detail.includes("InsufficientFunds")
        ? "insufficient_funds"
        : "simulation_failed";
      return { ok: false, failureClass, detail };
    }

    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    const confirmationLevel = resolveSolanaCommitmentConfirmation();
    const confirmation = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      confirmationLevel,
    );

    if (confirmation.value.err) {
      return {
        ok: false,
        failureClass: "confirmation_failed",
        detail: JSON.stringify(confirmation.value.err),
      };
    }

    const status = await connection.getSignatureStatus(signature);
    const slot = status.value?.slot ?? confirmation.context.slot;
    return {
      ok: true,
      signature,
      slot,
      confirmationStatus: status.value?.confirmationStatus ?? confirmationLevel,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureClass: SolanaReceiptCommitmentFailureClass = message.includes("429")
      || message.includes("503")
      || message.includes("fetch")
      ? "rpc_unavailable"
      : message.toLowerCase().includes("insufficient")
        ? "insufficient_funds"
        : "broadcast_failed";
    return { ok: false, failureClass, detail: message.slice(0, 500) };
  }
}
