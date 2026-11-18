import { PublicKey } from "@solana/web3.js";
import {
  PROOF_CONTINUITY_REGISTRY_DISCRIMINATOR,
  RECEIPT_COMMITMENT_DISCRIMINATOR,
} from "./anchorDiscriminator";
import { decodeProofContinuityRegistry } from "./decodeRegistry";
import { decodeReceiptCommitmentAccount } from "./decodeCommitment";
import { findProofRegistryPda, findReceiptCommitmentPda, proofContinuityProgramId } from "./pda";

export type SolanaAccountEvidence = {
  address: string;
  owner: string;
  data: Buffer;
};

export type CommitmentChainEvidence = {
  programId?: string;
  registryAdmin: string;
  receiptIdHash: Buffer;
  commitment: SolanaAccountEvidence;
  registry: SolanaAccountEvidence;
};

export type ChainEvidenceAuthResult = { ok: true } | { ok: false; reason: string };

function pkBase58(input: string): PublicKey | null {
  try {
    return new PublicKey(input);
  } catch {
    return null;
  }
}

/** Authenticate owner, program, PDAs, and Anchor discriminators before field decode. */
export function authenticateCommitmentChainEvidence(
  evidence: CommitmentChainEvidence,
): ChainEvidenceAuthResult {
  const programId = evidence.programId ?? proofContinuityProgramId().toBase58();
  const programPk = pkBase58(programId);
  const adminPk = pkBase58(evidence.registryAdmin);
  const commitmentPk = pkBase58(evidence.commitment.address);
  const registryPk = pkBase58(evidence.registry.address);
  const commitmentOwner = pkBase58(evidence.commitment.owner);
  const registryOwner = pkBase58(evidence.registry.owner);
  if (!programPk || !adminPk || !commitmentPk || !registryPk || !commitmentOwner || !registryOwner) {
    return { ok: false, reason: "chain_evidence_invalid_pubkey" };
  }
  if (commitmentOwner.toBase58() !== programId || registryOwner.toBase58() !== programId) {
    return { ok: false, reason: "chain_evidence_wrong_account_owner" };
  }
  if (!evidence.commitment.data.subarray(0, 8).equals(RECEIPT_COMMITMENT_DISCRIMINATOR)) {
    return { ok: false, reason: "chain_evidence_wrong_commitment_discriminator" };
  }
  if (!evidence.registry.data.subarray(0, 8).equals(PROOF_CONTINUITY_REGISTRY_DISCRIMINATOR)) {
    return { ok: false, reason: "chain_evidence_wrong_registry_discriminator" };
  }

  const expectedRegistry = findProofRegistryPda(adminPk);
  if (!registryPk.equals(expectedRegistry.address)) {
    return { ok: false, reason: "chain_evidence_registry_pda_mismatch" };
  }

  const expectedCommitment = findReceiptCommitmentPda(registryPk, evidence.receiptIdHash);
  if (!commitmentPk.equals(expectedCommitment.address)) {
    return { ok: false, reason: "chain_evidence_commitment_pda_mismatch" };
  }

  const commitment = decodeReceiptCommitmentAccount(evidence.commitment.data);
  const registry = decodeProofContinuityRegistry(evidence.registry.data);
  if (!commitment || !registry) {
    return { ok: false, reason: "chain_evidence_decode_failed" };
  }

  const registryBytes = registryPk.toBuffer().toString("hex");
  if (commitment.registry !== registryBytes) {
    return { ok: false, reason: "chain_evidence_commitment_registry_mismatch" };
  }
  if (registry.admin !== adminPk.toBuffer().toString("hex")) {
    return { ok: false, reason: "chain_evidence_registry_admin_mismatch" };
  }

  return { ok: true };
}