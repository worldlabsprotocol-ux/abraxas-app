// FILE: lib/policy/evaluatePolicy.ts
// Evaluate partner policy against a subject's active claims with issuer trust enforcement.

import type { CredentialClaimRecord, AssuranceLevel } from "@/lib/credentials/claimSchema";
import { isSandboxClaim } from "@/lib/credentials/sandboxClaims";
import { resolveClaimStatusAtRead } from "@/lib/trust/credentialStatusRegistry";
import { PRODUCT_ELIGIBILITY_OVER_21 } from "@/lib/idv/ageEligibility";
import type {
  PartnerPolicyRules,
  PolicyEvaluationContext,
  PolicyEvaluationResult,
  RequiredClaimRule,
} from "@/lib/policy/types";

const PRODUCT_ELIGIBILITY_CLAIM_TYPE = "product_eligibility";

/** True when stored rules_json explicitly lists product_eligibility in required_claims. */
export function policyExplicitlyRequiresProductEligibility(rules: PartnerPolicyRules): boolean {
  return (rules.required_claims ?? []).some(
    (rule) => rule.claim_type === PRODUCT_ELIGIBILITY_CLAIM_TYPE,
  );
}

/**
 * Returns stored required_claims only — no minimum_age expansion.
 * Historical and active policy evaluation must use immutable rules_json as persisted.
 */
export function resolveStoredRequiredClaims(rules: PartnerPolicyRules): RequiredClaimRule[] {
  return [...(rules.required_claims ?? [])];
}

/**
 * @deprecated Do not use for policy evaluation. minimum_age metadata does not imply
 * product_eligibility until explicitly published in required_claims (migration 076 draft → publish).
 */
export function expandRequiredClaimsForMinimumAge(
  rules: PartnerPolicyRules,
): RequiredClaimRule[] {
  return resolveStoredRequiredClaims(rules);
}

/** Fail closed when explicit product_eligibility conflicts with minimum_age intent. */
export function hasConflictingProductEligibilityRule(rules: PartnerPolicyRules): boolean {
  if (rules.minimum_age == null || rules.minimum_age < 21) return false;
  if (!policyExplicitlyRequiresProductEligibility(rules)) return false;
  return (rules.required_claims ?? []).some(
    (rule) => rule.claim_type === PRODUCT_ELIGIBILITY_CLAIM_TYPE
      && rule.must_equal != null
      && String(rule.must_equal) !== PRODUCT_ELIGIBILITY_OVER_21,
  );
}

const ASSURANCE_RANK: Record<AssuranceLevel, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

function claimMeetsRule(
  claim: CredentialClaimRecord | undefined,
  rule: RequiredClaimRule,
  policySandboxOnly: boolean,
  trustContext?: PolicyEvaluationContext,
): boolean {
  if (!claim) return false;

  const liveStatus = resolveClaimStatusAtRead({
    status: claim.status,
    expires_at: claim.expires_at,
  });
  if (liveStatus !== "active") return false;

  const sandbox = isSandboxClaim(claim);
  if (sandbox && !policySandboxOnly) return false;
  if (!sandbox && policySandboxOnly && rule.claim_type === "screening_outcome") return false;

  const now = Date.now();
  const maxAgeHours = rule.credential_max_age_hours ?? rule.max_age_hours;
  if (maxAgeHours != null) {
    const issued = new Date(claim.issued_at).getTime();
    const maxMs = maxAgeHours * 60 * 60 * 1000;
    if (now - issued > maxMs) return false;
  }

  if (claim.expires_at && new Date(claim.expires_at).getTime() < now) return false;

  const minAssurance = rule.min_assurance;
  if (minAssurance && claim.assurance_level) {
    if (ASSURANCE_RANK[claim.assurance_level] < ASSURANCE_RANK[minAssurance]) {
      return false;
    }
  }

  if (rule.must_equal !== undefined) {
    const outcome = claim.claim_value.outcome ?? claim.claim_value.value ?? claim.claim_value.status;
    if (String(outcome) !== String(rule.must_equal)) return false;
  }

  if (trustContext && (trustContext.trustRulesByClaimType || rule.accepted_issuers?.length)) {
    const dbRule = trustContext.trustRulesByClaimType?.get(rule.claim_type);
    const acceptedIssuers = rule.accepted_issuers ?? dbRule?.accepted_issuer_ids ?? [];
    if (acceptedIssuers.length > 0 && !acceptedIssuers.includes(claim.issuer_id)) {
      return false;
    }

    const minFromRule = dbRule?.minimum_assurance_level;
    if (minFromRule && claim.assurance_level) {
      if (ASSURANCE_RANK[claim.assurance_level] < ASSURANCE_RANK[minFromRule]) return false;
    }

    const jurisdictions = rule.accepted_jurisdictions ?? dbRule?.accepted_jurisdictions ?? [];
    if (jurisdictions.length > 0 && claim.jurisdiction) {
      if (!jurisdictions.includes("global") && !jurisdictions.includes(claim.jurisdiction)) {
        return false;
      }
    }
  }

  return true;
}

function trustFailureReason(
  claim: CredentialClaimRecord | undefined,
  rule: RequiredClaimRule,
  trustContext?: PolicyEvaluationContext,
): string {
  if (!claim) return `missing:${rule.claim_type}`;
  const liveStatus = resolveClaimStatusAtRead({ status: claim.status, expires_at: claim.expires_at });
  if (liveStatus === "under_review") return `under_review:${rule.claim_type}`;
  if (liveStatus === "suspended") return `suspended:${rule.claim_type}`;
  if (liveStatus === "revoked") return `revoked:${rule.claim_type}`;
  if (liveStatus === "expired") return `expired:${rule.claim_type}`;

  const dbRule = trustContext?.trustRulesByClaimType?.get(rule.claim_type);
  const acceptedIssuers = rule.accepted_issuers ?? dbRule?.accepted_issuer_ids ?? [];
  if (acceptedIssuers.length > 0 && !acceptedIssuers.includes(claim.issuer_id)) {
    return `untrusted_issuer:${claim.issuer_id}`;
  }

  const minFromRule = rule.min_assurance ?? dbRule?.minimum_assurance_level;
  if (minFromRule && claim.assurance_level) {
    if (ASSURANCE_RANK[claim.assurance_level] < ASSURANCE_RANK[minFromRule as AssuranceLevel]) {
      return `insufficient_assurance:${rule.claim_type}`;
    }
  }

  return `missing:${rule.claim_type}`;
}

export function evaluatePolicyRules(
  rules: PartnerPolicyRules,
  claims: CredentialClaimRecord[],
  context?: PolicyEvaluationContext,
): PolicyEvaluationResult {
  const policySandboxOnly = rules.sandbox_only === true;
  const decisionContext: PolicyEvaluationResult["decision_context"] = policySandboxOnly
    ? "sandbox_only"
    : "production";
  const productionUsable = !policySandboxOnly;

  if (hasConflictingProductEligibilityRule(rules)) {
    return {
      decision: "denied",
      claims: {},
      reason_codes: ["policy_conflict:product_eligibility"],
      valid_until: null,
      missing_claims: [PRODUCT_ELIGIBILITY_CLAIM_TYPE],
      decision_context: decisionContext,
      production_usable: false,
    };
  }

  if (rules.allow_core_only) {
    return {
      decision: "approved",
      claims: { core_only: true },
      reason_codes: [],
      valid_until: null,
      missing_claims: [],
      decision_context: decisionContext,
      production_usable: productionUsable,
    };
  }

  const required = resolveStoredRequiredClaims(rules);
  const claimsByType = new Map<string, CredentialClaimRecord>();
  for (const c of claims) {
    if (!claimsByType.has(c.claim_type)) claimsByType.set(c.claim_type, c);
  }

  const disclosed: Record<string, unknown> = {};
  const missing: string[] = [];
  const reasonCodes: string[] = [];

  if (context?.jurisdiction && rules.blocked_jurisdictions?.includes(context.jurisdiction)) {
    return {
      decision: "denied",
      claims: {},
      reason_codes: ["jurisdiction_blocked"],
      valid_until: null,
      missing_claims: required.map(r => r.claim_type),
      decision_context: decisionContext,
      production_usable: false,
    };
  }

  for (const rule of required) {
    const claim = claimsByType.get(rule.claim_type);
    if (!claimMeetsRule(claim, rule, policySandboxOnly, context)) {
      missing.push(rule.claim_type);
      reasonCodes.push(trustFailureReason(claim, rule, context));
      continue;
    }
    disclosed[rule.claim_type] = sanitizeClaimForPartner(claim!);
  }

  if (missing.length > 0) {
    const screeningMissing = missing.includes("screening_outcome");
    const underReview = reasonCodes.some(r => r.startsWith("under_review:"));
    const decision = underReview
      ? "manual_review"
      : screeningMissing && missing.length === 1
        ? "manual_review"
        : "denied";
    return {
      decision,
      claims: disclosed,
      reason_codes: reasonCodes.length ? reasonCodes : missing.map(m => `missing:${m}`),
      valid_until: computeValidUntil(claims, required),
      missing_claims: missing,
      decision_context: decisionContext,
      production_usable: false,
    };
  }

  return {
    decision: "approved",
    claims: disclosed,
    reason_codes: [],
    valid_until: computeValidUntil(claims, required),
    missing_claims: [],
    decision_context: decisionContext,
    production_usable: productionUsable,
  };
}

function sanitizeClaimForPartner(claim: CredentialClaimRecord): Record<string, unknown> {
  return {
    claim_type: claim.claim_type,
    assurance_level: claim.assurance_level,
    issued_at: claim.issued_at,
    expires_at: claim.expires_at,
    issuer_id: claim.issuer_id,
    value: claim.claim_value,
    jurisdiction: claim.jurisdiction,
  };
}

function computeValidUntil(
  claims: CredentialClaimRecord[],
  rules: RequiredClaimRule[],
): string | null {
  const types = new Set(rules.map(r => r.claim_type));
  let earliest: number | null = null;

  for (const c of claims) {
    if (!types.has(c.claim_type)) continue;
    const candidates: number[] = [];
    if (c.expires_at) candidates.push(new Date(c.expires_at).getTime());
    const rule = rules.find(r => r.claim_type === c.claim_type);
    const maxAge = rule?.credential_max_age_hours ?? rule?.max_age_hours;
    if (maxAge) {
      candidates.push(new Date(c.issued_at).getTime() + maxAge * 3600000);
    }
    for (const t of candidates) {
      if (earliest == null || t < earliest) earliest = t;
    }
  }

  return earliest != null ? new Date(earliest).toISOString() : null;
}
