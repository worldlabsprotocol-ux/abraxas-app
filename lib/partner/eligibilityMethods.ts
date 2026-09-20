// FILE: lib/partner/eligibilityMethods.ts
// Policy-driven method selection. Identity/liveness is never the default first step.

import type { AssuranceLevel } from "@/lib/credentials/claimSchema";
import { SELF_ATTESTATION_ISSUER, SELF_ATTESTATION_CLAIM_TYPE } from "@/lib/assurance/selfAttestation/constants";
import {
  GOOGLE_ACCOUNT_NOT_ELIGIBILITY,
  inferPolicyPackFromPolicyId,
  policyPackIsEconomicDemo,
  policyPackRequiresIdentityEvidence,
  resolvePolicyPack,
  type PolicyPack,
} from "@/lib/partner/launchpad/policyPacks";
import { resolveDisclosureProfile } from "@/lib/privacy/selectiveDisclosure";

export type EligibilityMethodId =
  | "account_login"
  | "reuse_existing_proof"
  | "partner_age_check"
  | "privacy_preserving"
  | "identity_liveness"
  | "self_attestation";

export interface EligibilityDisclosure {
  requirement: string;
  purpose: string;
  disclosed_result: string;
  withheld: string[];
  assurance_level: AssuranceLevel;
  sandbox_only: boolean;
  economic_demo: boolean;
  not_age_verification: boolean;
}

export interface EligibilityMethodOption {
  id: EligibilityMethodId;
  label: string;
  why: string;
  qualifies: boolean;
  circle_settlement_eligible: boolean;
  primary: boolean;
  available: boolean;
}

export interface EligibilityMethodPlan {
  disclosure: EligibilityDisclosure;
  methods: EligibilityMethodOption[];
  no_non_id_method_satisfies: boolean;
  identity_is_default: false;
  login_is_not_eligibility: string;
}

const ASSURANCE_RANK: Record<AssuranceLevel, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

export function assuranceMeetsMinimum(actual: AssuranceLevel | string | undefined, required: AssuranceLevel): boolean {
  if (!actual || !(actual in ASSURANCE_RANK)) return false;
  return ASSURANCE_RANK[actual as AssuranceLevel] >= ASSURANCE_RANK[required];
}

export function resolvePackForEligibility(policyIdOrPack: string | PolicyPack): PolicyPack | null {
  if (typeof policyIdOrPack !== "string") return policyIdOrPack;
  return resolvePolicyPack(policyIdOrPack) ?? inferPolicyPackFromPolicyId(policyIdOrPack);
}

export function buildEligibilityDisclosure(pack: PolicyPack): EligibilityDisclosure {
  const resolved = resolveDisclosureProfile(pack.id);
  const withheld = resolved.ok ? [...resolved.profile.withheld] : pack.partner_does_not_receive;
  const disclosed = resolved.ok ? resolved.profile.result_category : pack.disclosed_result;
  return {
    requirement: pack.display_name,
    purpose: pack.holder_explanation,
    disclosed_result: disclosed,
    withheld,
    assurance_level: pack.minimum_assurance,
    sandbox_only: pack.production_suitability === "sandbox_only" || pack.rules.sandbox_only === true,
    economic_demo: policyPackIsEconomicDemo(pack),
    not_age_verification: policyPackIsEconomicDemo(pack),
  };
}

export function planEligibilityMethods(input: {
  pack: PolicyPack;
  existingProofCompatible?: boolean;
  partnerAgeCheckConfigured?: boolean;
  partnerAgeCheckAssurance?: AssuranceLevel | string;
  privacyPreservingAvailable?: boolean;
  browseSelfAttestAllowed?: boolean;
}): EligibilityMethodPlan {
  const pack = input.pack;
  const disclosure = buildEligibilityDisclosure(pack);
  const browseOnly = pack.rules.browse_access_only === true;
  const requiresIdentity = policyPackRequiresIdentityEvidence(pack);
  const existing = Boolean(input.existingProofCompatible);
  const partnerConfigured = Boolean(input.partnerAgeCheckConfigured);
  const partnerQualifies = partnerConfigured
    && assuranceMeetsMinimum(input.partnerAgeCheckAssurance, pack.minimum_assurance);
  const privacy = Boolean(input.privacyPreservingAvailable);
  const selfAttestAllowed = browseOnly && input.browseSelfAttestAllowed !== false;

  const methods: EligibilityMethodOption[] = [
    {
      id: "account_login",
      label: "Google / account sign-in",
      why: GOOGLE_ACCOUNT_NOT_ELIGIBILITY,
      qualifies: false,
      circle_settlement_eligible: false,
      primary: false,
      available: true,
    },
    {
      id: "reuse_existing_proof",
      label: "Use an existing private verification",
      why: "A previous private verification may satisfy this request. The new partner receives only this policy’s result. Selecting reuse does not issue a result.",
      qualifies: existing,
      circle_settlement_eligible: existing && !browseOnly && !selfAttestAllowed,
      primary: existing,
      available: existing,
    },
    {
      id: "partner_age_check",
      label: "Partner-provided eligibility check",
      why: partnerQualifies
        ? `This partner check is configured at ${input.partnerAgeCheckAssurance} and meets the ${pack.minimum_assurance} requirement.`
        : partnerConfigured
          ? `This partner check is configured but its assurance does not meet ${pack.minimum_assurance}. It cannot issue a settlement-capable receipt.`
          : "Offer this route when the partner has configured an eligibility check.",
      qualifies: partnerQualifies,
      circle_settlement_eligible: partnerQualifies && !browseOnly,
      primary: !existing && partnerQualifies,
      available: partnerConfigured,
    },
    {
      id: "privacy_preserving",
      label: "Privacy-preserving verification",
      why: "Share only the policy result. The partner does not receive ID images or a profile.",
      qualifies: privacy && !browseOnly,
      circle_settlement_eligible: privacy && !browseOnly,
      primary: !existing && !partnerQualifies && privacy,
      available: privacy,
    },
    {
      id: "self_attestation",
      label: "Self-attestation (browse only)",
      why: "Self-attestation is L0 browse access only. It cannot satisfy an authoritative policy and cannot settle Circle USDC.",
      qualifies: selfAttestAllowed,
      circle_settlement_eligible: false,
      primary: false,
      available: selfAttestAllowed,
    },
    {
      id: "identity_liveness",
      label: "Identity / liveness",
      why: requiresIdentity
        ? "This policy lists identity or liveness as an accepted assurance method. It is not the default first step when another qualifying method exists."
        : "This policy does not require identity or liveness.",
      qualifies: requiresIdentity,
      circle_settlement_eligible: requiresIdentity && !browseOnly,
      primary: false,
      available: requiresIdentity,
    },
  ];

  const nonIdSatisfies = methods.some((method) =>
    method.qualifies && method.id !== "identity_liveness" && method.id !== "account_login" && method.id !== "self_attestation",
  );

  return {
    disclosure,
    methods,
    no_non_id_method_satisfies: requiresIdentity && !nonIdSatisfies && !existing && !partnerQualifies && !privacy,
    identity_is_default: false,
    login_is_not_eligibility: GOOGLE_ACCOUNT_NOT_ELIGIBILITY,
  };
}

export function selfAttestationCannotSatisfyAuthoritative(pack: PolicyPack): boolean {
  return !pack.rules.browse_access_only;
}

export function accountLoginIsNotEligibility(): string {
  return GOOGLE_ACCOUNT_NOT_ELIGIBILITY;
}

export function isInadequateCircleSettlementReceipt(receipt: {
  evaluated_claim_refs?: Array<{ claim_type?: string; issuer_id?: string }>;
  decision_context?: string;
  production_usable?: boolean;
  policy_id?: string;
}): { inadequate: boolean; reason: string | null } {
  const pack = receipt.policy_id ? inferPolicyPackFromPolicyId(receipt.policy_id) : null;
  const refs = receipt.evaluated_claim_refs ?? [];

  if (refs.length === 0) {
    return { inadequate: true, reason: "account_login_or_empty_claims" };
  }

  const selfAttest = refs.some((ref) =>
    ref.claim_type === SELF_ATTESTATION_CLAIM_TYPE
    || ref.issuer_id === SELF_ATTESTATION_ISSUER
    || String(ref.issuer_id ?? "").includes("self-attest"),
  );
  if (selfAttest) {
    return { inadequate: true, reason: "self_attestation" };
  }

  if (pack && policyPackIsEconomicDemo(pack) && receipt.production_usable === true) {
    return { inadequate: true, reason: "sandbox_demo_production" };
  }

  if (pack && policyPackIsEconomicDemo(pack) && receipt.decision_context !== "sandbox_only") {
    return { inadequate: true, reason: "sandbox_demo_not_sandbox_context" };
  }

  return { inadequate: false, reason: null };
}
