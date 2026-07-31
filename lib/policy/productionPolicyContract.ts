// FILE: lib/policy/productionPolicyContract.ts
// Canonical production partner policies and claim issuance contract (audit source).

import type { ClaimType } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules } from "@/lib/policy/types";

export interface ProductionPartnerPolicy {
  id: string;
  partnerId: string;
  sandboxOnly: boolean;
  rules: PartnerPolicyRules;
}

/** Active partner policies seeded in migrations — audit against this list. */
export const PRODUCTION_PARTNER_POLICIES: ProductionPartnerPolicy[] = [
  {
    id: "abraxas-core-v1",
    partnerId: "abraxas",
    sandboxOnly: false,
    rules: { allow_core_only: true, required_claims: [] },
  },
  {
    id: "abraxas-booking-v1",
    partnerId: "abraxas",
    sandboxOnly: false,
    rules: {
      required_claims: [
        { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
        { claim_type: "liveness_passed", max_age_hours: 8760 },
        { claim_type: "wallet_binding_confirmed", max_age_hours: 8760 },
      ],
    },
  },
  {
    id: "abraxas-rwa-us-v1",
    partnerId: "abraxas",
    sandboxOnly: false,
    rules: {
      required_claims: [
        { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
        { claim_type: "liveness_passed", max_age_hours: 8760 },
        { claim_type: "screening_outcome", max_age_hours: 24, must_equal: "clear" },
        { claim_type: "wallet_binding_confirmed", max_age_hours: 720 },
      ],
      blocked_jurisdictions: [],
    },
  },
  {
    id: "abraxas-verified-participant-v1",
    partnerId: "abraxas",
    sandboxOnly: false,
    rules: {
      required_claims: [
        { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
        { claim_type: "liveness_passed", max_age_hours: 8760 },
        { claim_type: "wallet_binding_confirmed", max_age_hours: 8760 },
      ],
    },
  },
  {
    id: "cielo-verified-guest-v1",
    partnerId: "cielo",
    sandboxOnly: false,
    rules: {
      required_claims: [
        { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L3" },
      ],
      account_required: true,
      consent_required: true,
    },
  },
  {
    id: "partner-sandbox-gate-v1",
    partnerId: "abraxas-partner-sandbox",
    sandboxOnly: true,
    rules: {
      sandbox_only: true,
      required_claims: [
        { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
        { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
        { claim_type: "screening_outcome", max_age_hours: 24, must_equal: "clear" },
      ],
    },
  },
  {
    id: "good-trouble-retail-v1",
    partnerId: "good-trouble-cannabis",
    sandboxOnly: true,
    rules: {
      sandbox_only: true,
      required_claims: [
        { claim_type: "identity_verified", max_age_hours: 8760, min_assurance: "L2" },
        { claim_type: "liveness_passed", max_age_hours: 8760 },
        { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
        { claim_type: "residency_country", max_age_hours: 8760 },
      ],
      account_required: true,
      consent_required: true,
      minimum_age: 21,
      session_receipt_hours: 24,
      product_eligibility_action: "regulated_retail_purchase",
      biometric_thresholds: {
        face_min: 0.90,
        liveness_min: 0.92,
        fraud_risk_max: 0.15,
        alignment_min: 0.45,
        blur_min: 0.40,
        lighting_min: 0.38,
        screen_replay_max: 0.45,
        deepfake_max: 0.50,
      },
    },
  },
  {
    id: "good-trouble-batch-v1",
    partnerId: "good-trouble-cannabis",
    sandboxOnly: true,
    rules: {
      sandbox_only: true,
      required_claims: [
        { claim_type: "asset_ownership_reviewed", max_age_hours: 2160, min_assurance: "L2" },
      ],
    },
  },
];

export type ClaimIssuanceSource =
  | "abraxasCaptureApprovedClaims"
  | "manualApprovedClaims"
  | "veriffApprovedClaims"
  | "walletBindingClaim_zklogin"
  | "walletBindingClaim_siwe"
  | "not_implemented";

export interface ClaimContractRow {
  claimType: ClaimType;
  issuedBy: ClaimIssuanceSource[];
  storedIn: string;
  resolvedBy: string;
  evaluatedBy: string;
  regressionTests: string[];
}

/** Where each claim type is issued, stored, resolved, and evaluated. */
export const CLAIM_CONTRACT: Record<ClaimType, ClaimContractRow> = {
  identity_verified: {
    claimType: "identity_verified",
    issuedBy: ["abraxasCaptureApprovedClaims", "manualApprovedClaims", "veriffApprovedClaims"],
    storedIn: "credential_claims",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: ["lib/credentials/claimSchema.test.ts", "lib/goodTrouble/goodTroubleRetailWiring.integration.test.ts"],
  },
  liveness_passed: {
    claimType: "liveness_passed",
    issuedBy: ["abraxasCaptureApprovedClaims", "manualApprovedClaims", "veriffApprovedClaims"],
    storedIn: "credential_claims",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: ["lib/goodTrouble/goodTroubleRetailWiring.integration.test.ts"],
  },
  government_id_verified: {
    claimType: "government_id_verified",
    issuedBy: ["abraxasCaptureApprovedClaims", "manualApprovedClaims", "veriffApprovedClaims"],
    storedIn: "credential_claims",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: [],
  },
  screening_outcome: {
    claimType: "screening_outcome",
    issuedBy: ["abraxasCaptureApprovedClaims", "manualApprovedClaims", "veriffApprovedClaims"],
    storedIn: "credential_claims",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: ["lib/policy/evaluatePolicy.test.ts"],
  },
  residency_country: {
    claimType: "residency_country",
    issuedBy: ["abraxasCaptureApprovedClaims", "manualApprovedClaims", "veriffApprovedClaims"],
    storedIn: "credential_claims",
    resolvedBy: "getActiveClaims → claim_value.country",
    evaluatedBy: "evaluatePolicyRules + loadPolicyTrustContext",
    regressionTests: ["lib/credentials/claimSchema.test.ts", "lib/goodTrouble/goodTroubleRetailWiring.integration.test.ts"],
  },
  wallet_binding_confirmed: {
    claimType: "wallet_binding_confirmed",
    issuedBy: ["walletBindingClaim_zklogin", "walletBindingClaim_siwe"],
    storedIn: "credential_claims + wallet_bindings",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: ["lib/goodTrouble/goodTroubleRetailWiring.integration.test.ts", "lib/cielo/verifiedGuestPolicy.test.ts"],
  },
  asset_ownership_reviewed: {
    claimType: "asset_ownership_reviewed",
    issuedBy: ["not_implemented"],
    storedIn: "credential_claims (planned)",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: [],
  },
  risk_review: {
    claimType: "risk_review",
    issuedBy: ["not_implemented"],
    storedIn: "credential_claims (planned)",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: [],
  },
  kyb_verified: {
    claimType: "kyb_verified",
    issuedBy: ["not_implemented"],
    storedIn: "credential_claims (planned)",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: [],
  },
  ubo_verified: {
    claimType: "ubo_verified",
    issuedBy: ["not_implemented"],
    storedIn: "credential_claims (planned)",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: [],
  },
  accredited_status: {
    claimType: "accredited_status",
    issuedBy: ["not_implemented"],
    storedIn: "credential_claims (planned)",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: [],
  },
  product_eligibility: {
    claimType: "product_eligibility",
    issuedBy: ["not_implemented"],
    storedIn: "credential_claims (planned)",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: [],
  },
  wallet_risk_band: {
    claimType: "wallet_risk_band",
    issuedBy: ["not_implemented"],
    storedIn: "credential_claims (planned)",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: [],
  },
  asset_title_verified: {
    claimType: "asset_title_verified",
    issuedBy: ["not_implemented"],
    storedIn: "credential_claims (planned)",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: [],
  },
  transfer_eligibility: {
    claimType: "transfer_eligibility",
    issuedBy: ["not_implemented"],
    storedIn: "credential_claims (planned)",
    resolvedBy: "getActiveClaims",
    evaluatedBy: "evaluatePolicyRules",
    regressionTests: [],
  },
};

/** Policy flags stored in rules_json but enforced outside evaluatePolicyRules. */
export const POLICY_FLAGS_ENFORCED_EXTERNALLY: Record<string, string> = {
  account_required: "Partner flow / evaluateCieloVerifiedGuest",
  consent_required: "Partner flow consent gate / evaluateCieloVerifiedGuest",
  minimum_age: "buildPartnerVerificationResult (over_21, no raw DOB)",
  session_receipt_hours: "computeSessionReceiptExpiresAt",
  product_eligibility_action: "createVerificationRequest requestedAction",
  biometric_thresholds: "resolveCapturePolicy / analyzeCapture",
  blocked_jurisdictions: "evaluatePolicyRules",
  allow_core_only: "evaluatePolicyRules",
  sandbox_only: "evaluatePolicyRules (decision_context)",
};

/**
 * Cielo rules_json fields present in DB migrations (026, 032) but not typed in PartnerPolicyRules.
 * Enforced only in evaluateCieloVerifiedGuest — not part of the frozen TypeScript policy contract.
 */
export const CIELO_DB_ONLY_POLICY_FLAGS: Record<string, string> = {
  profile_required: "evaluateCieloVerifiedGuest (hasCompleteProfile)",
  identity_optional: "evaluateCieloVerifiedGuest (skips identity credential requirement)",
};

export function requiredClaimsForPolicy(policyId: string): ClaimType[] {
  const policy = PRODUCTION_PARTNER_POLICIES.find(p => p.id === policyId);
  if (!policy?.rules.required_claims) return [];
  return policy.rules.required_claims.map(r => r.claim_type as ClaimType);
}

export function allRequiredClaimsAcrossPolicies(): ClaimType[] {
  const set = new Set<ClaimType>();
  for (const policy of PRODUCTION_PARTNER_POLICIES) {
    for (const claim of requiredClaimsForPolicy(policy.id)) {
      set.add(claim);
    }
  }
  return Array.from(set);
}
