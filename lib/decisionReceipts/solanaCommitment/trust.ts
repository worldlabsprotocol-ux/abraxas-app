import type { SolanaReceiptCommitmentRecord } from "@/lib/decisionReceipts/solanaCommitment/contract";
import { policyRequiresSolanaReceiptCommitment } from "@/lib/decisionReceipts/solanaCommitment/policy";
import type { SolanaCommitmentTrustResult } from "@/lib/decisionReceipts/solanaCommitment/contract";
import { solanaReceiptCommitmentsEnabled } from "@/lib/decisionReceipts/solanaCommitment/config";

export function evaluateSolanaCommitmentTrust(input: {
  policyId: string;
  commitment: SolanaReceiptCommitmentRecord | null;
  requireOnChain?: boolean;
}): SolanaCommitmentTrustResult {
  const onChainRequired =
    input.requireOnChain === true
    || (solanaReceiptCommitmentsEnabled() && policyRequiresSolanaReceiptCommitment(input.policyId));

  if (!onChainRequired) {
    return {
      on_chain_required: false,
      on_chain_confirmed: false,
      commitment_status: input.commitment?.status ?? "none",
      invalidation_reasons: [],
    };
  }

  if (!input.commitment) {
    return {
      on_chain_required: true,
      on_chain_confirmed: false,
      commitment_status: "none",
      invalidation_reasons: ["solana_commitment_missing"],
    };
  }

  if (input.commitment.status === "SUPERSEDED") {
    return {
      on_chain_required: true,
      on_chain_confirmed: false,
      commitment_status: "SUPERSEDED",
      invalidation_reasons: ["solana_commitment_superseded"],
    };
  }

  if (input.commitment.status === "CONFIRMED" && input.commitment.transaction_signature) {
    return {
      on_chain_required: true,
      on_chain_confirmed: true,
      commitment_status: "CONFIRMED",
      invalidation_reasons: [],
    };
  }

  const pendingLike = input.commitment.status === "PENDING"
    || input.commitment.status === "SUBMITTED"
    || input.commitment.status === "RETRYABLE";

  return {
    on_chain_required: true,
    on_chain_confirmed: false,
    commitment_status: input.commitment.status,
    invalidation_reasons: [
      pendingLike ? "solana_commitment_pending" : "solana_commitment_not_confirmed",
    ],
  };
}
