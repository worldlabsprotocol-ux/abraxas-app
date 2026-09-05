// FILE: lib/assurance/compliancePolicyRegistry.ts
// Cross-industry compliance policy dimensions — configuration, not hard-coded engine logic.

import type { ClaimType } from "@/lib/credentials/claimSchema";
import type { AssuranceLevel } from "@/lib/credentials/claimSchema";

/** Industries Abraxas policies may target — each uses shared primitives. */
export const COMPLIANCE_INDUSTRIES = [
  "cannabis_age_gated_retail",
  "alcohol_tobacco",
  "financial_services",
  "crypto_digital_assets",
  "healthcare",
  "gaming_gambling",
  "employment_credentials",
  "education",
  "regulated_marketplace",
  "geographic_restriction",
] as const;

export type ComplianceIndustry = (typeof COMPLIANCE_INDUSTRIES)[number];

/** Example claim schemas — issuance requires provenance; policy defines which are required. */
export const EXAMPLE_COMPLIANCE_CLAIM_TYPES: readonly ClaimType[] = [
  "product_eligibility",
  "identity_verified",
  "residency_country",
  "government_id_verified",
  "screening_outcome",
  "wallet_binding_confirmed",
  "accredited_status",
  "kyb_verified",
  "ubo_verified",
] as const;

/** Separable assurance concepts — never conflate in policy evaluation. */
export const ASSURANCE_CONCEPTS = [
  "authentication",
  "identity_evidence",
  "eligibility",
  "partner_decision",
  "transaction_time_obligation",
] as const;

export type AssuranceConcept = (typeof ASSURANCE_CONCEPTS)[number];

/** Dimensions operators configure per policy version (stored in rules_json + registry). */
export interface CompliancePolicyConfiguration {
  industry?: ComplianceIndustry;
  jurisdiction?: string;
  product_or_service?: string;
  transaction_type?: string;
  risk_level?: "low" | "medium" | "high";
  required_evidence_sources?: string[];
  minimum_assurance?: AssuranceLevel;
  credential_max_age_hours?: number;
  transaction_time_verification_required?: boolean;
  retention_days?: number;
  partner_restrictions?: string[];
}

/**
 * Operator/counsel boundary: Abraxas enforces stored policy versions;
 * legal conclusions and production approval live outside the engine.
 */
export const OPERATOR_CONFIGURATION_BOUNDARY = {
  abraxas_enforces: [
    "versioned policy rules_json",
    "claim provenance and assurance at issuance",
    "fresh partner-bound evaluation per request",
    "signed receipt binding (partner_id, policy_id, nonce)",
    "expiration and revocation at read time",
    "audit event immutability",
    "privacy minimization in partner-facing payloads",
  ],
  operator_or_counsel_approves: [
    "industry-specific legal sufficiency",
    "jurisdiction allow/block lists",
    "evidence vendor authorization",
    "retention and deletion schedules",
    "production publish of policy drafts",
    "transaction-time merchant obligations",
  ],
} as const;
