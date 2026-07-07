// FILE: lib/policy/types.ts

import type { AssuranceLevel, ClaimType } from "@/lib/credentials/claimSchema";

export type PolicyDecision = "approved" | "denied" | "manual_review";

export interface RequiredClaimRule {
  claim_type: ClaimType | string;
  max_age_hours?: number;
  min_assurance?: AssuranceLevel;
  must_equal?: string | boolean;
}

export interface PartnerPolicyRules {
  allow_core_only?: boolean;
  required_claims?: RequiredClaimRule[];
  blocked_jurisdictions?: string[];
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
