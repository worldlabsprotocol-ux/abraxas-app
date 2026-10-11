import type { IndependentTrustVerificationInput } from "@/lib/protocol/trust/independent/contract";
import type {
  AuthorizationLifecycleState,
  ContinuousVerificationOutcome,
  VerificationAuxiliaryOutcome,
} from "@/lib/protocol/trust/lifecycle/blockchainAuthorizationLifecycle";
import type { VerificationCacheEntry, VerificationCachePolicy } from "@/lib/protocol/trust/independent/verificationCache";
import type { RevocationObservationRequest } from "@/lib/protocol/trust/independent/observeRevocationOnChain";

export const CONTINUOUS_TRUST_VERIFIER_SCHEMA = "abraxas_continuous_trust_verifier_v532" as const;

export type ContinuousTrustVerificationInput = IndependentTrustVerificationInput & {
  /** Governance-controlled memo publishers allowed to post abx-rvkt invalidation memos. */
  authorized_revoker_pubkeys?: string[];
  /** Optional live revocation/supersession transactions to observe (read-only RPC). */
  revocation_observations?: RevocationObservationRequest[];
  /** Prior bounded cache entry from this relying party (optional). */
  verification_cache?: VerificationCacheEntry | null;
  cache_policy?: VerificationCachePolicy;
  /** When true, skip live RPC and use deterministic fixtures only. */
  rpc_available?: boolean;
  /** Required freshness for chain_required policies (defaults true). */
  require_fresh_chain_observation?: boolean;
};

export type ContinuousTrustVerificationResult = {
  schema: typeof CONTINUOUS_TRUST_VERIFIER_SCHEMA;
  outcome: ContinuousVerificationOutcome;
  auxiliary: VerificationAuxiliaryOutcome | null;
  authorization_lifecycle_state: AuthorizationLifecycleState | null;
  reasons: string[];
  verified_properties: string[];
  evidence_sources: string[];
  observation_timestamps: {
    verified_at: string;
    cache_expires_at: string | null;
    commitment_observed_at: string | null;
    invalidation_observed_at: string | null;
  };
  chain_environment: string | null;
  cache: VerificationCacheEntry | null;
  blockers: string[];
};
