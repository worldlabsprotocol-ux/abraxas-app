// FILE: lib/policy/resolveEffectivePolicyRules.ts
// Sandbox pilot overlay — published policy registry remains canonical for production.

import {
  GOOD_TROUBLE_RETAIL_V2_PENDING_RULES,
} from "@/lib/policy/productionPolicyContract";
import { policyExplicitlyRequiresProductEligibility } from "@/lib/policy/evaluatePolicy";
import type { PartnerPolicy, PartnerPolicyRules } from "@/lib/policy/types";
import { GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";

/** Explicit allowlist — overlay never applies outside this policy id. */
export const SANDBOX_POLICY_OVERLAY_ALLOWLIST = new Set<string>([
  GOOD_TROUBLE_RETAIL_POLICY_ID,
]);

export interface PolicyOverlayDecision {
  effective_rules: PartnerPolicyRules;
  overlay_applied: boolean;
  overlay_reason: "published_registry" | "sandbox_pilot_overlay" | "stored_rules";
}

/**
 * Returns rules used for live policy evaluation.
 *
 * Production rule: when `rules_json` already lists required claims (including
 * product_eligibility), the published registry is canonical — no overlay.
 *
 * Sandbox pilot: a single named policy may overlay pending draft rules ONLY when
 * `sandbox_only === true`. This does not replace operator publication.
 */
export function resolvePolicyOverlayDecision(policy: PartnerPolicy): PolicyOverlayDecision {
  const stored = policy.rules_json;

  if (policyExplicitlyRequiresProductEligibility(stored)) {
    return {
      effective_rules: stored,
      overlay_applied: false,
      overlay_reason: "published_registry",
    };
  }

  const overlayEligible =
    SANDBOX_POLICY_OVERLAY_ALLOWLIST.has(policy.id)
    && policy.status === "active"
    && stored.sandbox_only === true
    && stored.minimum_age != null
    && stored.minimum_age >= 21;

  if (overlayEligible) {
    return {
      effective_rules: GOOD_TROUBLE_RETAIL_V2_PENDING_RULES,
      overlay_applied: true,
      overlay_reason: "sandbox_pilot_overlay",
    };
  }

  return {
    effective_rules: stored,
    overlay_applied: false,
    overlay_reason: "stored_rules",
  };
}

/** @see resolvePolicyOverlayDecision */
export function resolveEffectivePolicyRules(policy: PartnerPolicy): PartnerPolicyRules {
  return resolvePolicyOverlayDecision(policy).effective_rules;
}
