// Bounded verification cache — stale high-assurance status fails closed (Build #532).

import type { ContinuousVerificationOutcome } from "@/lib/protocol/trust/lifecycle/blockchainAuthorizationLifecycle";

export const VERIFICATION_CACHE_SCHEMA = "abraxas_verification_cache_v532" as const;

export type VerificationCachePolicy = {
  /** Max age for reusing a prior observation without refresh (ms). */
  max_age_ms: number;
  /** When true, expired cache entries cannot yield PERMIT (UNAVAILABLE instead). */
  high_assurance_fail_closed: boolean;
};

export const DEFAULT_HIGH_ASSURANCE_CACHE_POLICY: VerificationCachePolicy = {
  max_age_ms: 60_000,
  high_assurance_fail_closed: true,
};

export type VerificationCacheEntry = {
  schema: typeof VERIFICATION_CACHE_SCHEMA;
  cache_key: string;
  outcome: ContinuousVerificationOutcome;
  reasons: string[];
  observed_at: string;
  expires_at: string;
  commitment_slot: number | null;
  invalidation_slot: number | null;
};

export function buildVerificationCacheKey(input: {
  receipt_id: string;
  relying_party_id: string;
  policy_commitment_hash: string;
}): string {
  return `${input.receipt_id}:${input.relying_party_id}:${input.policy_commitment_hash}`;
}

export function readVerificationCache(input: {
  cache: VerificationCacheEntry | null | undefined;
  now?: Date;
  policy: VerificationCachePolicy;
}): { usable: boolean; stale: boolean; entry: VerificationCacheEntry | null } {
  if (!input.cache) return { usable: false, stale: false, entry: null };
  const nowMs = (input.now ?? new Date()).getTime();
  const expires = Date.parse(input.cache.expires_at);
  if (Number.isNaN(expires) || nowMs >= expires) {
    return { usable: false, stale: true, entry: input.cache };
  }
  return { usable: true, stale: false, entry: input.cache };
}

export function writeVerificationCacheEntry(input: {
  cache_key: string;
  outcome: ContinuousVerificationOutcome;
  reasons: string[];
  observed_at: Date;
  policy: VerificationCachePolicy;
  commitment_slot: number | null;
  invalidation_slot: number | null;
}): VerificationCacheEntry {
  const observedAt = input.observed_at.toISOString();
  const expiresAt = new Date(input.observed_at.getTime() + input.policy.max_age_ms).toISOString();
  return {
    schema: VERIFICATION_CACHE_SCHEMA,
    cache_key: input.cache_key,
    outcome: input.outcome,
    reasons: input.reasons,
    observed_at: observedAt,
    expires_at: expiresAt,
    commitment_slot: input.commitment_slot,
    invalidation_slot: input.invalidation_slot,
  };
}

export function resolveCachedOutcome(input: {
  cache: VerificationCacheEntry | null | undefined;
  policy: VerificationCachePolicy;
  rpc_available: boolean;
  now?: Date;
}): ContinuousVerificationOutcome | null {
  const read = readVerificationCache({ cache: input.cache, now: input.now, policy: input.policy });
  if (!input.rpc_available) {
    if (read.usable && read.entry?.outcome === "PERMIT") {
      return input.policy.high_assurance_fail_closed ? "UNAVAILABLE" : read.entry.outcome;
    }
    return "UNAVAILABLE";
  }
  if (read.usable && read.entry) return read.entry.outcome;
  if (read.stale && input.policy.high_assurance_fail_closed) return "UNAVAILABLE";
  return null;
}
