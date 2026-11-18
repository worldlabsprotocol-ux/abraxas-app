import { Connection, PublicKey } from "@solana/web3.js";
import { PROOF_CONTINUITY_PROGRAM_ID } from "./constants";
import { authenticateCommitmentChainEvidence, type CommitmentChainEvidence } from "./solanaAccountEvidence";
import { hashReceiptId } from "./message";
import { findProofRegistryPda, findReceiptCommitmentPda } from "./pda";
import {
  verifyExecutionTransaction,
  type ExecutionTxExpectations,
} from "./verifyExecutionTransaction";

export type FetchChainEvidenceInput = {
  rpcUrl: string;
  programId?: string;
  registryAdmin: string;
  receiptId: string;
  /** Required for acceptance — account bytes alone are insufficient. */
  transactionSignature: string;
  finalitySlots?: number;
  executionExpectations: ExecutionTxExpectations;
};

export type FetchChainEvidenceResult =
  | { ok: true; evidence: CommitmentChainEvidence; slot: number; signature: string }
  | { ok: false; reason: string };

function accountToEvidence(
  address: PublicKey,
  owner: PublicKey,
  data: Buffer,
): { address: string; owner: string; data: Buffer } {
  return { address: address.toBase58(), owner: owner.toBase58(), data };
}

/** Reads live Solana accounts from pinned RPC after proving the finalized execution transaction. */
export async function fetchCommitmentChainEvidenceFromRpc(
  input: FetchChainEvidenceInput,
): Promise<FetchChainEvidenceResult> {
  const signature = input.transactionSignature?.trim();
  if (!signature) return { ok: false, reason: "chain_transaction_signature_required" };

  const programId = input.programId ?? PROOF_CONTINUITY_PROGRAM_ID;
  let connection: Connection;
  try {
    connection = new Connection(input.rpcUrl, { commitment: "finalized" });
  } catch {
    return { ok: false, reason: "chain_rpc_invalid" };
  }

  const txProof = await verifyExecutionTransaction(
    connection,
    signature,
    input.executionExpectations,
    input.finalitySlots ?? 32,
  );
  if (!txProof.ok) return txProof;

  let adminPk: PublicKey;
  let programPk: PublicKey;
  try {
    adminPk = new PublicKey(input.registryAdmin);
    programPk = new PublicKey(programId);
  } catch {
    return { ok: false, reason: "chain_pinned_keys_invalid" };
  }

  const receiptHash = hashReceiptId(input.receiptId);
  const registry = findProofRegistryPda(adminPk);
  const commitment = findReceiptCommitmentPda(registry.address, receiptHash);

  const [registryInfo, commitmentInfo] = await connection.getMultipleAccountsInfo(
    [registry.address, commitment.address],
    { commitment: "finalized", minContextSlot: txProof.slot },
  );
  if (!registryInfo || !commitmentInfo) {
    return { ok: false, reason: "chain_accounts_missing" };
  }
  if (!registryInfo.owner.equals(programPk) || !commitmentInfo.owner.equals(programPk)) {
    return { ok: false, reason: "chain_evidence_wrong_account_owner" };
  }

  const evidence: CommitmentChainEvidence = {
    programId,
    registryAdmin: adminPk.toBase58(),
    receiptIdHash: receiptHash,
    registry: accountToEvidence(registry.address, registryInfo.owner, Buffer.from(registryInfo.data)),
    commitment: accountToEvidence(commitment.address, commitmentInfo.owner, Buffer.from(commitmentInfo.data)),
  };

  const auth = authenticateCommitmentChainEvidence(evidence);
  if (!auth.ok) return auth;

  return { ok: true, evidence, slot: txProof.slot, signature };
}