// FILE: lib/policy/changeControl/compare.ts
// Safe comparison of two policy versions. Never includes PII, DOB, documents, or secrets.

import type { PartnerPolicy, PartnerPolicyRules } from "@/lib/policy/types";

export const POLICY_WITHHELD_FIELDS = [
  "date of birth",
  "government ID images",
  "legal name",
  "email",
  "wallet address",
  "OAuth tokens",
  "credential JWT",
  "document data",
] as const;

export type PolicyVersionCompatibility = "identical" | "compatible" | "breaking";

export interface PolicyVersionSurface {
  version: number;
  status: string;
  name: string;
  required_claims: string[];
  assurance_level: string | null;
  purpose: string[];
  result_fields: string[];
  withheld_fields: string[];
  sandbox_only: boolean;
  effective_at: string | null;
  deprecate_effective_at: string | null;
}

export interface PolicyVersionComparison {
  from: PolicyVersionSurface;
  to: PolicyVersionSurface;
  compatibility: PolicyVersionCompatibility;
  changed: {
    required_claims: boolean;
    assurance_level: boolean;
    purpose: boolean;
    result_fields: boolean;
    withheld_fields: boolean;
  };
  added_claims: string[];
  removed_claims: string[];
  raised_assurance: boolean;
  blocker_code: "policy_version_incompatible_claims" | null;
}

function minAssurance(rules: PartnerPolicyRules): string | null {
  const ranks: Record<string, number> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 };
  let min: string | null = rules.minimum_assurance_cap ?? null;
  for (const rule of rules.required_claims ?? []) {
    if (!rule.min_assurance) continue;
    if (!min || (ranks[rule.min_assurance] ?? 0) < (ranks[min] ?? 0)) {
      min = rule.min_assurance;
    }
  }
  return min;
}

function maxAssurance(rules: PartnerPolicyRules): string | null {
  const ranks: Record<string, number> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 };
  let max: string | null = rules.minimum_assurance_cap ?? null;
  for (const rule of rules.required_claims ?? []) {
    if (!rule.min_assurance) continue;
    if (!max || (ranks[rule.min_assurance] ?? 0) > (ranks[max] ?? 0)) {
      max = rule.min_assurance;
    }
  }
  return max;
}

export function policyVersionSurface(policy: PartnerPolicy): PolicyVersionSurface {
  const rules = policy.rules_json ?? {};
  const claims = (rules.required_claims ?? []).map((rule) => rule.claim_type);
  const purpose = [
    ...(rules.allowed_purposes ?? []),
    ...(rules.product_eligibility_action ? [rules.product_eligibility_action] : []),
    ...(rules.browse_access_only ? ["browse"] : []),
  ];
  return {
    version: policy.version,
    status: policy.status,
    name: policy.name,
    required_claims: claims,
    assurance_level: minAssurance(rules),
    purpose,
    result_fields: claims,
    withheld_fields: [...POLICY_WITHHELD_FIELDS],
    sandbox_only: rules.sandbox_only === true,
    effective_at: policy.effective_at ?? null,
    deprecate_effective_at: policy.deprecate_effective_at ?? null,
  };
}

export function comparePolicyVersions(from: PartnerPolicy, to: PartnerPolicy): PolicyVersionComparison {
  const fromSurface = policyVersionSurface(from);
  const toSurface = policyVersionSurface(to);
  const fromClaims = new Set(fromSurface.required_claims);
  const toClaims = new Set(toSurface.required_claims);
  const added_claims = toSurface.required_claims.filter((claim) => !fromClaims.has(claim));
  const removed_claims = fromSurface.required_claims.filter((claim) => !toClaims.has(claim));
  const ranks: Record<string, number> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 };
  const raised_assurance =
    (ranks[maxAssurance(to.rules_json) ?? "L0"] ?? 0) > (ranks[maxAssurance(from.rules_json) ?? "L0"] ?? 0);

  const changed = {
    required_claims: added_claims.length > 0 || removed_claims.length > 0,
    assurance_level: fromSurface.assurance_level !== toSurface.assurance_level || raised_assurance,
    purpose: fromSurface.purpose.join("|") !== toSurface.purpose.join("|"),
    result_fields: fromSurface.result_fields.join("|") !== toSurface.result_fields.join("|"),
    withheld_fields: false,
  };

  const breaking = added_claims.length > 0 || raised_assurance;
  const anyChange = Object.values(changed).some(Boolean);
  const compatibility: PolicyVersionCompatibility = breaking
    ? "breaking"
    : anyChange
      ? "compatible"
      : "identical";

  return {
    from: fromSurface,
    to: toSurface,
    compatibility,
    changed,
    added_claims,
    removed_claims,
    raised_assurance,
    blocker_code: breaking ? "policy_version_incompatible_claims" : null,
  };
}
