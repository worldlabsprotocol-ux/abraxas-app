import { Connection, PublicKey } from "@solana/web3.js";
import { PROOF_CONTINUITY_PROGRAM_ID } from "./constants";
import { authenticateCommitmentChainEvidence, type CommitmentChainEvidence } from "./solanaAccountEvidence";
import { hashReceiptId } from "./message";
import { findProofRegistryPda, findReceiptCommitmentPda } from "./pda";

export type FetchChainEvidenceInput = {
  rpcUrl: string;
  programId?: string;
  registryAdmin: string;
  receiptId: string;
  transactionSignature?: string;
  minContextSlot?: number;
  finalitySlots?: number;
};

export type FetchChainEvidenceResult =
  | { ok: true; evidence: CommitmentChainEvidence; slot: number; signature: string | null }
  | { ok: false; reason: string };

function accountToEvidence(
  address: PublicKey,
  owner: PublicKey,
  data: Buffer,
): { address: string; owner: string; data: Buffer } {
  return { address: address.toBase58(), owner: owner.toBase58(), data };
}

async function resolveObservationSlot(
  connection: Connection,
  signature: string | undefined,
  finalitySlots: number,
): Promise<{ ok: true; slot: number; signature: string | null } | { ok: false; reason: string }> {
  if (!signature) {
    const slot = await connection.getSlot("finalized");
    return { ok: true, slot, signature: null };
  }
  const status = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
  const value = status?.value?.[0];
  if (!value) return { ok: false, reason: "chain_transaction_not_found" };
  if (value.err) return { ok: false, reason: "chain_transaction_failed" };
  if (value.confirmationStatus !== "finalized" && value.confirmationStatus !== "confirmed") {
    return { ok: false, reason: "chain_transaction_not_finalized" };
  }
  const slot = value.slot ?? 0;
  const head = await connection.getSlot("finalized");
  if (head - slot < finalitySlots) return { ok: false, reason: "chain_finality_not_met" };
  return { ok: true, slot, signature };
}

/** Reads live Solana accounts from pinned RPC — never accepts caller-supplied account bytes. */
export async function fetchCommitmentChainEvidenceFromRpc(
  input: FetchChainEvidenceInput,
): Promise<FetchChainEvidenceResult> {
  const programId = input.programId ?? PROOF_CONTINUITY_PROGRAM_ID;
  let connection: Connection;
  try {
    connection = new Connection(input.rpcUrl, { commitment: "finalized" });
  } catch {
    return { ok: false, reason: "chain_rpc_invalid" };
  }

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

  const slotResult = await resolveObservationSlot(
    connection,
    input.transactionSignature,
    input.finalitySlots ?? 32,
  );
  if (!slotResult.ok) return slotResult;

  const minContext = input.minContextSlot ?? slotResult.slot;
  const [registryInfo, commitmentInfo] = await connection.getMultipleAccountsInfo(
    [registry.address, commitment.address],
    { commitment: "finalized", minContextSlot: minContext },
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

  return { ok: true, evidence, slot: slotResult.slot, signature: slotResult.signature };
}