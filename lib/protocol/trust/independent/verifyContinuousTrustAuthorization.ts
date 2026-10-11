// Continuous authorization verification — current validity, not historical finality (Build #532).

import { buildReceiptCommitmentDigest } from "@/lib/decisionReceipts/solanaCommitment/digest";
import { resolveSolanaCommitmentRpcUrl } from "@/lib/decisionReceipts/solanaCommitment/config";
import type { ContinuousTrustVerificationInput, ContinuousTrustVerificationResult } from "@/lib/protocol/trust/independent/continuousContract";
import { CONTINUOUS_TRUST_VERIFIER_SCHEMA } from "@/lib/protocol/trust/independent/continuousContract";
import { verifyIndependentTrustDecision } from "@/lib/protocol/trust/independent/verifyIndependentTrustDecision";
import { verifyLocalTrustDecision } from "@/lib/protocol/trust/independent/verifyLocal";
import { observeReceiptCommitmentOnChain } from "@/lib/protocol/trust/independent/verifyChainObservation";
import { observeRevocationEventsOnChain } from "@/lib/protocol/trust/independent/observeRevocationOnChain";
import {
  buildVerificationCacheKey,
  DEFAULT_HIGH_ASSURANCE_CACHE_POLICY,
  resolveCachedOutcome,
  writeVerificationCacheEntry,
} from "@/lib/protocol/trust/independent/verificationCache";
import type { AuthorizationLifecycleState } from "@/lib/protocol/trust/lifecycle/blockchainAuthorizationLifecycle";

function mapLifecycle(input: {
  issuedValid: boolean;
  expired: boolean;
  revoked: boolean;
  superseded: boolean;
  active: boolean;
}): AuthorizationLifecycleState | null {
  if (input.superseded) return "SUPERSEDED";
  if (input.revoked) return "REVOKED";
  if (input.expired) return "EXPIRED";
  if (input.active) return "ACTIVE";
  if (input.issuedValid) return "ISSUED";
  return null;
}

export async function verifyContinuousTrustAuthorization(
  input: ContinuousTrustVerificationInput,
): Promise<ContinuousTrustVerificationResult> {
  const now = input.now ?? new Date();
  const verifiedAt = now.toISOString();
  const cachePolicy = input.cache_policy ?? DEFAULT_HIGH_ASSURANCE_CACHE_POLICY;
  const rpcAvailable = input.rpc_available !== false;
  const tier = input.bundle.envelope.chain_assurance_tier;
  const highAssurance = tier === "chain_required";

  const cacheKey = buildVerificationCacheKey({
    receipt_id: input.bundle.envelope.receipt_id,
    relying_party_id: input.relying_party_id,
    policy_commitment_hash: input.immutable_policy_commitment_hash,
  });

  if (!rpcAvailable) {
    const cached = resolveCachedOutcome({
      cache: input.verification_cache,
      policy: cachePolicy,
      rpc_available: false,
      now,
    });
    if (cached) {
      return {
        schema: CONTINUOUS_TRUST_VERIFIER_SCHEMA,
        outcome: cached,
        auxiliary: cached === "UNAVAILABLE" ? "STATUS_UNAVAILABLE" : null,
        authorization_lifecycle_state: null,
        reasons: cached === "UNAVAILABLE" ? ["rpc_unavailable_stale_cache_rejected"] : ["rpc_unavailable_cache_reused"],
        verified_properties: [],
        evidence_sources: ["verification_cache"],
        observation_timestamps: {
          verified_at: verifiedAt,
          cache_expires_at: input.verification_cache?.expires_at ?? null,
          commitment_observed_at: input.verification_cache?.observed_at ?? null,
          invalidation_observed_at: null,
        },
        chain_environment: null,
        cache: input.verification_cache ?? null,
        blockers: cached === "UNAVAILABLE" ? ["rpc_unavailable"] : [],
      };
    }
  }

  const local = verifyLocalTrustDecision(input);
  const base = await verifyIndependentTrustDecision(input);

  const reasons: string[] = [...local.reasons];
  const evidence_sources = [...base.evidence_sources];
  const verified_properties = [...base.verified_properties];
  const blockers = [...base.blockers];

  let commitmentSlot: number | null = null;
  let invalidationSlot: number | null = null;
  let commitmentObservedAt: string | null = null;
  let invalidationObservedAt: string | null = null;
  let chainEnvironment = base.chain_environment;

  const targetCommitmentDigest = buildReceiptCommitmentDigest(local.receiptPayloadHash);
  const policyHash = input.immutable_policy_commitment_hash;

  let lifecycleRevoked = input.revocation_evidence?.revoked === true || Boolean(input.bundle.envelope.revocation_ref);
  let lifecycleSuperseded = Boolean(input.revocation_evidence?.superseded_by_receipt_id || input.bundle.envelope.supersession_ref);
  let lifecycleExpired = local.reasons.includes("decision_expired");

  const requireLive = input.require_live_chain_observation
    ?? input.require_fresh_chain_observation
    ?? tier === "chain_required";

  if ((tier === "chain_observed" || tier === "chain_required") && requireLive && rpcAvailable) {
    const hint = input.commitment_hint;
    const chainIdentity = input.chain_identity ?? {
      network_id: hint?.network_id ?? "solana_devnet",
      cluster: hint?.cluster ?? "devnet",
      rpc_urls: [resolveSolanaCommitmentRpcUrl()],
      confirmation_threshold: "finalized" as const,
    };
    chainEnvironment = `${chainIdentity.network_id}/${chainIdentity.cluster}`;

    const commitmentObs = await observeReceiptCommitmentOnChain({
      transactionSignature: hint?.transaction_signature,
      receiptId: input.bundle.envelope.receipt_id,
      receiptPayloadHash: local.receiptPayloadHash,
      committerPubkey: hint?.committer_pubkey ?? "",
      chainIdentity,
    });
    evidence_sources.push(...commitmentObs.evidence_sources);

    if (commitmentObs.status === "pass") {
      commitmentSlot = commitmentObs.slot;
      commitmentObservedAt = verifiedAt;
      verified_properties.push("commitment_finality_observed");
    }

    const revokerKeys = input.authorized_revoker_pubkeys?.length
      ? input.authorized_revoker_pubkeys
      : hint?.committer_pubkey
        ? [hint.committer_pubkey]
        : [];

    if (input.revocation_observations?.length && revokerKeys.length) {
      const rev = await observeRevocationEventsOnChain({
        observations: input.revocation_observations.map(o => ({
          ...o,
          targetCommitmentDigest: o.targetCommitmentDigest || targetCommitmentDigest,
          policyCommitmentHash: o.policyCommitmentHash || policyHash,
          authorizedRevokerPubkeys: o.authorizedRevokerPubkeys.length ? o.authorizedRevokerPubkeys : revokerKeys,
        })),
        chainIdentity,
      });
      if (rev.authoritative?.status === "pass") {
        invalidationSlot = rev.authoritative.slot;
        invalidationObservedAt = verifiedAt;
        if (rev.authoritative.action === "revoke") lifecycleRevoked = true;
        if (rev.authoritative.action === "supersede") lifecycleSuperseded = true;
        verified_properties.push("invalidation_observed_on_chain");
        evidence_sources.push(...rev.authoritative.evidence_sources);
      } else if (rev.authoritative?.status === "blocked") {
        blockers.push(...rev.authoritative.reasons);
      }
    }

    if (commitmentSlot != null && invalidationSlot != null && invalidationSlot >= commitmentSlot) {
      reasons.push("authoritative_invalidation_after_commitment");
    } else if (commitmentSlot != null && invalidationSlot != null && invalidationSlot < commitmentSlot) {
      reasons.push("stale_invalidation_ignored");
      lifecycleRevoked = false;
      lifecycleSuperseded = false;
    }
  }

  const issuedValid = local.ok || local.reasons.every(r => r.startsWith("issuer_key"));
  const lifecycleState = mapLifecycle({
    issuedValid: local.policyCommitmentOk && !local.reasons.includes("receipt_signature_invalid"),
    expired: lifecycleExpired,
    revoked: lifecycleRevoked,
    superseded: lifecycleSuperseded,
    active: local.ok && !lifecycleExpired && !lifecycleRevoked && !lifecycleSuperseded,
  });

  let outcome: ContinuousTrustVerificationResult["outcome"] = "DENY";
  let auxiliary: ContinuousTrustVerificationResult["auxiliary"] = null;

  if (lifecycleRevoked || lifecycleSuperseded || lifecycleExpired || !local.ok) {
    outcome = "DENY";
  } else if (base.overall === "pending") {
    outcome = "PENDING";
    auxiliary = "PENDING_FINALITY";
  } else if (base.overall === "blocked" || blockers.length > 0) {
    outcome = "UNAVAILABLE";
    auxiliary = "STATUS_UNAVAILABLE";
  } else if (base.overall === "pass" && lifecycleState === "ACTIVE") {
    outcome = "PERMIT";
  } else if (base.overall === "pass") {
    outcome = "PERMIT";
  } else {
    outcome = "DENY";
  }

  if (highAssurance && requireLive && commitmentSlot == null) {
    outcome = "UNAVAILABLE";
    auxiliary = "STATUS_UNAVAILABLE";
    reasons.push("fresh_chain_observation_missing");
    blockers.push("chain_required_fresh_observation");
  }

  const cache = writeVerificationCacheEntry({
    cache_key: cacheKey,
    outcome,
    reasons,
    observed_at: now,
    policy: cachePolicy,
    commitment_slot: commitmentSlot,
    invalidation_slot: invalidationSlot,
  });

  return {
    schema: CONTINUOUS_TRUST_VERIFIER_SCHEMA,
    outcome,
    auxiliary,
    authorization_lifecycle_state: lifecycleState,
    reasons,
    verified_properties,
    evidence_sources,
    observation_timestamps: {
      verified_at: verifiedAt,
      cache_expires_at: cache.expires_at,
      commitment_observed_at: commitmentObservedAt,
      invalidation_observed_at: invalidationObservedAt,
    },
    chain_environment: chainEnvironment,
    cache,
    blockers,
  };
}
