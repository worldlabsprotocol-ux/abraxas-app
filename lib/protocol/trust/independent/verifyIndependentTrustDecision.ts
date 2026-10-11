// Orchestrates local + live chain verification without Abraxas storage credentials.

import type {
  IndependentTrustVerificationInput,
  IndependentTrustVerificationResult,
} from "@/lib/protocol/trust/independent/contract";
import { INDEPENDENT_TRUST_VERIFIER_SCHEMA } from "@/lib/protocol/trust/independent/contract";
import { verifyLocalTrustDecision } from "@/lib/protocol/trust/independent/verifyLocal";
import { observeReceiptCommitmentOnChain } from "@/lib/protocol/trust/independent/verifyChainObservation";
import { resolveSolanaCommitmentRpcUrl } from "@/lib/decisionReceipts/solanaCommitment/config";

export async function verifyIndependentTrustDecision(
  input: IndependentTrustVerificationInput,
): Promise<IndependentTrustVerificationResult> {
  const requireLive = input.require_live_chain_observation
    ?? input.bundle.envelope.chain_assurance_tier === "chain_required";

  const local = verifyLocalTrustDecision({ ...input, require_live_chain_observation: requireLive });
  const verified_properties: string[] = [];
  const blockers: string[] = [];

  const localPhase = {
    status: local.ok ? ("pass" as const) : ("fail" as const),
    reasons: local.reasons,
  };

  if (local.policyCommitmentOk) verified_properties.push("policy_commitment_integrity");
  if (local.ok && local.reasons.length === 0) {
    verified_properties.push("receipt_signature_valid", "issuer_authorized", "audience_bound");
  }

  const tier = input.bundle.envelope.chain_assurance_tier;
  let chainPhase: IndependentTrustVerificationResult["phases"]["chain_observation"] = {
    status: "skipped",
    reasons: [],
  };
  let evidence_sources = [`trust_registry_ref:${input.trust_registry_ref}`, "local_ed25519_receipt_signature"];
  let chain_environment: string | null = null;

  if (tier === "off_chain") {
    chainPhase = { status: "skipped", reasons: ["chain_not_required"] };
  } else if (tier === "chain_observed" || tier === "chain_required") {
    if (!requireLive) {
      chainPhase = { status: "skipped", reasons: ["live_chain_observation_disabled"] };
    } else {
      const hint = input.commitment_hint;
      const chainIdentity = input.chain_identity ?? {
        network_id: hint?.network_id ?? "solana_devnet",
        cluster: hint?.cluster ?? "devnet",
        rpc_urls: [resolveSolanaCommitmentRpcUrl()],
        confirmation_threshold: "finalized" as const,
      };
      chain_environment = `${chainIdentity.network_id}/${chainIdentity.cluster}`;

      const observation = await observeReceiptCommitmentOnChain({
        transactionSignature: hint?.transaction_signature,
        receiptId: input.bundle.envelope.receipt_id,
        receiptPayloadHash: local.receiptPayloadHash,
        committerPubkey: hint?.committer_pubkey ?? "",
        chainIdentity,
      });

      evidence_sources = [...evidence_sources, ...observation.evidence_sources];

      if (observation.status === "pass") {
        chainPhase = { status: "pass", reasons: [] };
        verified_properties.push("on_chain_receipt_commitment_observed");
      } else if (observation.status === "pending") {
        chainPhase = { status: "pending", reasons: observation.reasons };
      } else if (observation.status === "blocked") {
        chainPhase = { status: "blocked", reasons: observation.reasons };
        blockers.push(...observation.reasons);
      } else {
        chainPhase = { status: "fail", reasons: observation.reasons };
      }

      if (tier === "chain_required") {
        if (local.chainAssurance.verdict === "unavailable" || chainPhase.status === "blocked") {
          blockers.push("chain_required_evidence_unavailable");
        }
        if (input.abraxas_db_claims_permit && chainPhase.status !== "pass") {
          localPhase.status = "fail";
          localPhase.reasons.push("db_cannot_override_chain");
        }
      }
    }
  }

  let overall: IndependentTrustVerificationResult["overall"] = "fail";
  if (localPhase.status === "pass") {
    if (tier === "off_chain") overall = "pass";
    else if (chainPhase.status === "pass") overall = "pass";
    else if (chainPhase.status === "pending") overall = "pending";
    else if (chainPhase.status === "blocked") overall = "blocked";
    else if (chainPhase.status === "skipped" && tier !== "chain_required") overall = "pass";
    else overall = "blocked";
  }

  if (local.chainAssurance.verdict === "fail") {
    overall = "fail";
  }

  return {
    schema: INDEPENDENT_TRUST_VERIFIER_SCHEMA,
    overall,
    phases: {
      local_cryptographic: localPhase,
      chain_observation: chainPhase,
    },
    verified_properties,
    evidence_sources,
    chain_environment,
    blockers,
    chain_assurance: {
      tier,
      finality: input.bundle.envelope.chain_finality,
    },
  };
}
