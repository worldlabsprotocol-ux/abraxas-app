import { Connection, PublicKey } from "@solana/web3.js";
import { buildReceiptCommitmentDigest } from "@/lib/decisionReceipts/solanaCommitment/digest";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";
import { decodeCommitmentStateAccount } from "@/lib/solana/trustRegistry/decodeCommitmentState";
import { deriveCommitmentStatePda, deriveTrustRegistryPda } from "@/lib/solana/trustRegistry/pda";
import type { ContinuousVerificationOutcome } from "@/lib/protocol/trust/lifecycle/blockchainAuthorizationLifecycle";

export type ProgramEnforcedVerificationInput = {
  receiptPayloadHash: string;
  policyCommitmentHash: string;
  registryDomainHex: string;
  programId?: string;
  rpcUrl: string;
  expectedProgramId?: string;
  /** When true, memo-only revocation evidence is rejected. */
  rejectMemoOnlyRevocation: boolean;
  memoRevocationSupplied?: boolean;
};

export type ProgramEnforcedVerificationResult = {
  outcome: ContinuousVerificationOutcome;
  reasons: string[];
  evidence_sources: string[];
  observed_at: string;
  commitment_state_pda: string | null;
  on_chain_status: string | null;
};

export async function verifyProgramEnforcedTrustState(
  input: ProgramEnforcedVerificationInput,
): Promise<ProgramEnforcedVerificationResult> {
  const observedAt = new Date().toISOString();
  const reasons: string[] = [];
  const evidence_sources: string[] = [];
  const programId = new PublicKey(input.programId ?? ABRAXAS_TRUST_REGISTRY_PROGRAM_ID);

  if (input.expectedProgramId && input.expectedProgramId !== programId.toBase58()) {
    return {
      outcome: "DENY",
      reasons: ["program_id_mismatch"],
      evidence_sources,
      observed_at: observedAt,
      commitment_state_pda: null,
      on_chain_status: null,
    };
  }

  if (input.rejectMemoOnlyRevocation && input.memoRevocationSupplied) {
    return {
      outcome: "DENY",
      reasons: ["memo_only_revocation_insufficient_for_program_enforced"],
      evidence_sources,
      observed_at: observedAt,
      commitment_state_pda: null,
      on_chain_status: null,
    };
  }

  const registryDomain = Buffer.from(input.registryDomainHex, "hex");
  if (registryDomain.length !== 32) {
    return {
      outcome: "UNAVAILABLE",
      reasons: ["invalid_registry_domain"],
      evidence_sources,
      observed_at: observedAt,
      commitment_state_pda: null,
      on_chain_status: null,
    };
  }

  const digest = buildReceiptCommitmentDigest(input.receiptPayloadHash);
  const digestBytes = Buffer.from(digest, "hex");
  const [registry] = deriveTrustRegistryPda(registryDomain, programId);
  const [commitmentPda] = deriveCommitmentStatePda(registry, digestBytes, programId);
  evidence_sources.push(`solana_rpc:${input.rpcUrl}`, `trust_registry_program:${programId.toBase58()}`);

  let connection: Connection;
  try {
    connection = new Connection(input.rpcUrl, "finalized");
  } catch {
    return {
      outcome: "UNAVAILABLE",
      reasons: ["rpc_unavailable"],
      evidence_sources,
      observed_at: observedAt,
      commitment_state_pda: commitmentPda.toBase58(),
      on_chain_status: null,
    };
  }

  let account;
  try {
    account = await connection.getAccountInfo(commitmentPda, "finalized");
  } catch {
    return {
      outcome: "UNAVAILABLE",
      reasons: ["rpc_read_failed"],
      evidence_sources,
      observed_at: observedAt,
      commitment_state_pda: commitmentPda.toBase58(),
      on_chain_status: null,
    };
  }

  if (!account || !account.owner.equals(programId)) {
    return {
      outcome: "UNAVAILABLE",
      reasons: ["commitment_state_missing_or_wrong_owner"],
      evidence_sources,
      observed_at: observedAt,
      commitment_state_pda: commitmentPda.toBase58(),
      on_chain_status: null,
    };
  }

  const decoded = decodeCommitmentStateAccount(Buffer.from(account.data));
  if (!decoded) {
    return {
      outcome: "UNAVAILABLE",
      reasons: ["commitment_state_decode_failed"],
      evidence_sources,
      observed_at: observedAt,
      commitment_state_pda: commitmentPda.toBase58(),
      on_chain_status: null,
    };
  }

  if (decoded.policy_commitment !== input.policyCommitmentHash) {
    return {
      outcome: "DENY",
      reasons: ["cross_policy_invalidation"],
      evidence_sources,
      observed_at: observedAt,
      commitment_state_pda: commitmentPda.toBase58(),
      on_chain_status: decoded.status,
    };
  }

  if (decoded.commitment_digest !== digest) {
    return {
      outcome: "DENY",
      reasons: ["commitment_digest_mismatch"],
      evidence_sources,
      observed_at: observedAt,
      commitment_state_pda: commitmentPda.toBase58(),
      on_chain_status: decoded.status,
    };
  }

  if (decoded.status === "REVOKED" || decoded.status === "SUPERSEDED") {
    return {
      outcome: "DENY",
      reasons: [`on_chain_${decoded.status.toLowerCase()}`],
      evidence_sources,
      observed_at: observedAt,
      commitment_state_pda: commitmentPda.toBase58(),
      on_chain_status: decoded.status,
    };
  }

  if (decoded.status === "ACTIVE") {
    return {
      outcome: "PERMIT",
      reasons: [],
      evidence_sources,
      observed_at: observedAt,
      commitment_state_pda: commitmentPda.toBase58(),
      on_chain_status: decoded.status,
    };
  }

  return {
    outcome: "UNAVAILABLE",
    reasons: ["unknown_on_chain_status"],
    evidence_sources,
    observed_at: observedAt,
    commitment_state_pda: commitmentPda.toBase58(),
    on_chain_status: decoded.status,
  };
}
