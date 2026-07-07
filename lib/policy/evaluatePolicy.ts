// FILE: lib/policy/evaluatePolicy.ts
// Evaluate partner policy against a subject's active claims.

import type { CredentialClaimRecord, AssuranceLevel } from "@/lib/credentials/claimSchema";
import type {
  PartnerPolicyRules,
  PolicyEvaluationResult,
  RequiredClaimRule,
} from "@/lib/policy/types";

const ASSURANCE_RANK: Record<AssuranceLevel, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

function claimMeetsRule(claim: CredentialClaimRecord | undefined, rule: RequiredClaimRule): boolean {
  if (!claim) return false;
  if (claim.status !== "active") return false;

  const now = Date.now();
  if (rule.max_age_hours != null) {
    const issued = new Date(claim.issued_at).getTime();
    const maxMs = rule.max_age_hours * 60 * 60 * 1000;
    if (now - issued > maxMs) return false;
  }

  if (claim.expires_at && new Date(claim.expires_at).getTime() < now) return false;

  if (rule.min_assurance && claim.assurance_level) {
    if (ASSURANCE_RANK[claim.assurance_level] < ASSURANCE_RANK[rule.min_assurance]) {
      return false;
    }
  }

  if (rule.must_equal !== undefined) {
    const outcome = claim.claim_value.outcome ?? claim.claim_value.value ?? claim.claim_value.status;
    if (String(outcome) !== String(rule.must_equal)) return false;
  }

  return true;
}

export function evaluatePolicyRules(
  rules: PartnerPolicyRules,
  claims: CredentialClaimRecord[],
  context?: { jurisdiction?: string | null },
): PolicyEvaluationResult {
  if (rules.allow_core_only) {
    return {
      decision: "approved",
      claims: { core_only: true },
      reason_codes: [],
      valid_until: null,
      missing_claims: [],
    };
  }

  const required = rules.required_claims ?? [];
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
    };
  }

  for (const rule of required) {
    const claim = claimsByType.get(rule.claim_type);
    if (!claimMeetsRule(claim, rule)) {
      missing.push(rule.claim_type);
      continue;
    }
    disclosed[rule.claim_type] = sanitizeClaimForPartner(claim!);
  }

  if (missing.length > 0) {
    const screeningMissing = missing.includes("screening_outcome");
    return {
      decision: screeningMissing && missing.length === 1 ? "manual_review" : "denied",
      claims: disclosed,
      reason_codes: missing.map(m => `missing:${m}`),
      valid_until: computeValidUntil(claims, required),
      missing_claims: missing,
    };
  }

  return {
    decision: "approved",
    claims: disclosed,
    reason_codes: [],
    valid_until: computeValidUntil(claims, required),
    missing_claims: [],
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
    if (rule?.max_age_hours) {
      candidates.push(new Date(c.issued_at).getTime() + rule.max_age_hours * 3600000);
    }
    for (const t of candidates) {
      if (earliest == null || t < earliest) earliest = t;
    }
  }

  return earliest != null ? new Date(earliest).toISOString() : null;
}
