// FILE: lib/passport/reusableEligibility/freshness.ts
// Per-policy reusable evidence freshness. Strictest applicable constraint wins.

import {
  inferPolicyPackFromPolicyId,
  type PolicyPack,
  type PolicyPackId,
} from "@/lib/partner/launchpad/policyPacks";
import type { InternalReusableFact } from "./contract";

export type ReuseFreshnessMode = "none" | "time_bound" | "source_expiry";

export interface ReuseEvidenceFreshnessRule {
  allow_reuse: boolean;
  mode: ReuseFreshnessMode;
  /** Max age from verified_at in hours. Null means no extra cap beyond mode rules. */
  max_age_hours: number | null;
}

export type FreshnessState = "fresh" | "stale" | "expired";

export function resolveReuseEvidenceFreshness(pack: PolicyPack): ReuseEvidenceFreshnessRule {
  const configured = pack.reuse_evidence_freshness;
  if (configured) return configured;

  if (pack.reuse_policy === "session") {
    const hours = pack.rules.session_receipt_hours ?? pack.receipt_lifetime_hours;
    return { allow_reuse: true, mode: "time_bound", max_age_hours: hours };
  }

  return {
    allow_reuse: true,
    mode: "source_expiry",
    max_age_hours: null,
  };
}

export function evaluateFactFreshness(input: {
  fact: InternalReusableFact;
  targetPolicyId: string;
  now?: Date;
}): { state: FreshnessState; reason: string | null } {
  const pack = inferPolicyPackFromPolicyId(input.targetPolicyId);
  if (!pack) return { state: "expired", reason: "unknown_target_pack" };

  const rule = resolveReuseEvidenceFreshness(pack);
  if (!rule.allow_reuse || rule.mode === "none") {
    return { state: "stale", reason: "reuse_not_permitted" };
  }

  const now = input.now ?? new Date();
  if (input.fact.status === "expired") {
    return { state: "expired", reason: "fact_expired" };
  }
  if (input.fact.expires_at && new Date(input.fact.expires_at) <= now) {
    return { state: "expired", reason: "source_expired" };
  }

  const verifiedAt = new Date(input.fact.verified_at ?? input.fact.issued_at).getTime();
  const ageMs = now.getTime() - verifiedAt;

  if (rule.mode === "source_expiry") {
    if (rule.max_age_hours != null && ageMs > rule.max_age_hours * 60 * 60 * 1000) {
      return { state: "stale", reason: "freshness_window_exceeded" };
    }
    return { state: "fresh", reason: null };
  }

  const windows: number[] = [];
  if (rule.max_age_hours != null) windows.push(rule.max_age_hours * 60 * 60 * 1000);
  if (pack.receipt_lifetime_hours != null) windows.push(pack.receipt_lifetime_hours * 60 * 60 * 1000);

  if (!windows.length) {
    return { state: "fresh", reason: null };
  }

  const strictestMs = Math.min(...windows);
  if (ageMs > strictestMs) {
    return { state: "stale", reason: "freshness_window_exceeded" };
  }

  return { state: "fresh", reason: null };
}

export function packIdFromPolicy(policyId: string): PolicyPackId | null {
  const pack = inferPolicyPackFromPolicyId(policyId);
  return pack?.id ?? null;
}
