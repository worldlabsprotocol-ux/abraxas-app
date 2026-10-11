// Deterministic chain assurance verification — fail-closed when chain_required.

import { evaluateSolanaCommitmentTrust } from "@/lib/decisionReceipts/solanaCommitment/trust";
import type { SolanaReceiptCommitmentRecord } from "@/lib/decisionReceipts/solanaCommitment/contract";
import type { ChainAssuranceTier, ChainFinalityStatus } from "@/lib/protocol/trust/trustDecisionEnvelope";
import { hashPolicyCommitment } from "@/lib/protocol/trust/trustDecisionEnvelope";
import { verifyMerkleInclusion, type MerkleInclusionProof } from "@/lib/protocol/trust/merkleInclusionProof";

export type ChainAssuranceVerdict = "pass" | "fail" | "pending" | "unavailable";

export type ChainAssuranceResult = {
  verdict: ChainAssuranceVerdict;
  tier: ChainAssuranceTier;
  finality: ChainFinalityStatus;
  reasons: string[];
};

export type IssuerRegistrySnapshot = {
  authorized_signer_key_ids: string[];
  revoked_signer_key_ids: string[];
};

export function verifyPolicyCommitment(input: {
  policyId: string;
  policyVersion: number;
  observedCommitmentHash: string;
}): boolean {
  return hashPolicyCommitment(input.policyId, input.policyVersion) === input.observedCommitmentHash;
}

export function verifyIssuerRegistry(input: {
  signingKeyId: string;
  registry: IssuerRegistrySnapshot;
}): { ok: boolean; reason?: string } {
  if (input.registry.revoked_signer_key_ids.includes(input.signingKeyId)) {
    return { ok: false, reason: "issuer_revoked" };
  }
  if (!input.registry.authorized_signer_key_ids.includes(input.signingKeyId)) {
    return { ok: false, reason: "issuer_not_authorized" };
  }
  return { ok: true };
}

export function verifyReceiptInclusionProof(proof: MerkleInclusionProof | null): boolean {
  if (!proof) return false;
  return verifyMerkleInclusion(proof);
}

export function evaluateChainAssurance(input: {
  tier: ChainAssuranceTier;
  policyId: string;
  policyVersion: number;
  policyCommitmentHash: string;
  signingKeyId: string;
  issuerRegistry: IssuerRegistrySnapshot;
  commitment: SolanaReceiptCommitmentRecord | null;
  inclusionProof?: MerkleInclusionProof | null;
  dbClaimsPermit?: boolean;
  chainObservedAvailable?: boolean;
}): ChainAssuranceResult {
  const reasons: string[] = [];

  if (!verifyPolicyCommitment({
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    observedCommitmentHash: input.policyCommitmentHash,
  })) {
    return {
      verdict: "fail",
      tier: input.tier,
      finality: "not_required",
      reasons: ["policy_commitment_mismatch"],
    };
  }

  const issuer = verifyIssuerRegistry({
    signingKeyId: input.signingKeyId,
    registry: input.issuerRegistry,
  });
  if (!issuer.ok) {
    return {
      verdict: "fail",
      tier: input.tier,
      finality: "not_required",
      reasons: [issuer.reason ?? "issuer_invalid"],
    };
  }

  if (input.tier === "off_chain") {
    return { verdict: "pass", tier: input.tier, finality: "not_required", reasons: [] };
  }

  if (input.tier === "chain_observed") {
    if (input.chainObservedAvailable === false) {
      return {
        verdict: "pass",
        tier: input.tier,
        finality: "unavailable",
        reasons: ["chain_observation_unavailable_off_chain_fallback"],
      };
    }
  }

  const trust = evaluateSolanaCommitmentTrust({
    policyId: input.policyId,
    commitment: input.commitment,
    requireOnChain: input.tier === "chain_required",
  });

  if (input.tier === "chain_required" && input.chainObservedAvailable === false) {
    return {
      verdict: "unavailable",
      tier: input.tier,
      finality: "unavailable",
      reasons: ["chain_outage"],
    };
  }

  if (input.inclusionProof && !verifyReceiptInclusionProof(input.inclusionProof)) {
    return {
      verdict: "fail",
      tier: input.tier,
      finality: trust.on_chain_confirmed ? "confirmed" : "pending",
      reasons: ["forged_inclusion_proof"],
    };
  }

  if (input.dbClaimsPermit === true && trust.on_chain_required && !trust.on_chain_confirmed) {
    return {
      verdict: "fail",
      tier: input.tier,
      finality: "pending",
      reasons: ["db_cannot_override_chain", ...trust.invalidation_reasons],
    };
  }

  if (input.tier === "chain_required") {
    if (trust.on_chain_confirmed) {
      return { verdict: "pass", tier: input.tier, finality: "confirmed", reasons: [] };
    }
    const pending = trust.invalidation_reasons.includes("solana_commitment_pending");
    return {
      verdict: pending ? "pending" : "fail",
      tier: input.tier,
      finality: pending ? "pending" : "superseded",
      reasons: trust.invalidation_reasons,
    };
  }

  return {
    verdict: trust.on_chain_confirmed ? "pass" : "pass",
    tier: input.tier,
    finality: trust.on_chain_confirmed ? "confirmed" : "pending",
    reasons: trust.invalidation_reasons,
  };
}
