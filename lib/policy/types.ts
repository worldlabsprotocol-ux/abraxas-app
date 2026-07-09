// FILE: lib/policy/types.ts

import type { AssuranceLevel, ClaimType } from "@/lib/credentials/claimSchema";

export type PolicyDecision = "approved" | "denied" | "manual_review";

export interface RequiredClaimRule {
  claim_type: ClaimType | string;
  max_age_hours?: number;
  min_assurance?: AssuranceLevel;
  must_equal?: string | boolean;
  /** Trusted issuers for this claim requirement (policy-level override) */
  accepted_issuers?: string[];
  accepted_jurisdictions?: string[];
  credential_max_age_hours?: number;
}

export interface PartnerPolicyRules {
  allow_core_only?: boolean;
  /** When true, policy is for sandbox demo only — decisions are not production-usable. */
  sandbox_only?: boolean;
  required_claims?: RequiredClaimRule[];
  blocked_jurisdictions?: string[];
  /** Enforce issuer trust registry on all required claims */
  enforce_issuer_trust?: boolean;
}

export interface PolicyEvaluationContext {
  jurisdiction?: string | null;
  partnerId?: string;
  policyId?: string;
  /** DB-backed trust rules loaded for this evaluation */
  trustRulesByClaimType?: Map<string, {
    accepted_issuer_ids: string[];
    minimum_assurance_level?: AssuranceLevel | null;
    accepted_jurisdictions?: string[];
    credential_max_age_hours?: number | null;
  }>;
}

export interface PartnerPolicy {
  id: string;
  partner_id: string;
  version: number;
  name: string;
  rules_json: PartnerPolicyRules;
  status: string;
}

export interface PolicyEvaluationResult {
  decision: PolicyDecision;
  claims: Record<string, unknown>;
  reason_codes: string[];
  valid_until: string | null;
  missing_claims: string[];
  /** Present when evaluation is sandbox-only — not usable for payments, investments, or transfers. */
  decision_context?: "sandbox_only" | "production";
  production_usable?: boolean;
}

export interface PolicyDecisionRecord {
  id: string;
  request_id: string | null;
  partner_id: string;
  subject_id: string;
  policy_id: string;
  policy_version: number;
  decision: PolicyDecision;
  claims_json: Record<string, unknown>;
  reason_codes: string[];
  valid_until: string | null;
  decided_at: string;
  status: string;
}
