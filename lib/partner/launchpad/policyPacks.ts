// FILE: lib/partner/launchpad/policyPacks.ts
// Versioned declarative policy packs — partners select proof, never submit executable policy.

import type { AssuranceLevel, ClaimType } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ISSUER,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";

export const POLICY_PACK_CATALOG_VERSION = 1;

export const GOOGLE_ACCOUNT_NOT_ELIGIBILITY =
  "Google sign-in creates an Abraxas account. It does not prove age, identity, residency, wallet control, membership, or any other eligibility claim.";

export const POLICY_PACK_FORBIDDEN_GUARANTEES = [
  "legal compliance",
  "gambling license",
  "accredited investor",
  "sanctions clearance",
  "kyc complete",
] as const;

export type PolicyPackId =
  | "age_18_retail"
  | "age_21_retail"
  | "residency_us"
  | "wallet_control"
  | "membership_credential"
  | "collector_redemption"
  | "identity_liveness"
  | "sandbox_economic_demo"
  | "sandbox_institutional_protocol_access";

export type PolicyPackProductionSuitability =
  | "sandbox_only"
  | "production_eligible_after_safety_gate";

export interface PolicyPack {
  id: PolicyPackId;
  catalog_version: number;
  display_name: string;
  holder_explanation: string;
  required_claims: ClaimType[];
  minimum_assurance: AssuranceLevel;
  receipt_lifetime_hours: number;
  intended_use_examples: string[];
  partner_receives: string;
  partner_does_not_receive: string[];
  production_suitability: PolicyPackProductionSuitability;
  disclosed_result: string;
  receipt_claim: string;
  reuse_policy: "session" | "time_bound";
  permitted_methods: string[];
  rules: PartnerPolicyRules;
}

const SANDBOX: Pick<PartnerPolicyRules, "sandbox_only" | "account_required" | "consent_required"> = {
  sandbox_only: true,
  account_required: true,
  consent_required: true,
};

function pack(
  input: Omit<PolicyPack, "catalog_version" | "rules"> & { rules: PartnerPolicyRules },
): PolicyPack {
  return { ...input, catalog_version: POLICY_PACK_CATALOG_VERSION };
}

export const POLICY_PACKS: Record<PolicyPackId, PolicyPack> = {
  age_18_retail: pack({
    id: "age_18_retail",
    display_name: "Age 18 eligibility",
    holder_explanation: "Confirm you meet an 18+ eligibility threshold without sharing your birth date with the partner.",
    required_claims: ["identity_verified"],
    minimum_assurance: "L1",
    receipt_lifetime_hours: 24,
    intended_use_examples: [
      "Adult only commerce storefront browse or checkout gates",
      "Membership sites that ask only whether the holder is 18+",
    ],
    partner_receives: "Signed result age_eligible_18 (boolean equivalent decision), not a birth date.",
    partner_does_not_receive: ["date of birth", "government ID images", "legal name", "email"],
    production_suitability: "production_eligible_after_safety_gate",
    disclosed_result: "age_eligible_18",
    receipt_claim: "age_threshold_met",
    reuse_policy: "time_bound",
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      minimum_age: 18,
      session_receipt_hours: 24,
      required_claims: [{ claim_type: "identity_verified", min_assurance: "L1" }],
    },
  }),
  age_21_retail: pack({
    id: "age_21_retail",
    display_name: "Age 21 eligibility",
    holder_explanation: "Confirm you meet a 21+ eligibility threshold without sharing your birth date with the partner.",
    required_claims: ["identity_verified"],
    minimum_assurance: "L2",
    receipt_lifetime_hours: 24,
    intended_use_examples: [
      "Age gated retail browse or purchase policies",
      "Hospitality check in that only needs a 21+ answer",
    ],
    partner_receives: "Signed result age_eligible_21. This is not a legal finding or license.",
    partner_does_not_receive: ["date of birth", "government ID images", "legal name", "email"],
    production_suitability: "production_eligible_after_safety_gate",
    disclosed_result: "age_eligible_21",
    receipt_claim: "age_threshold_met",
    reuse_policy: "time_bound",
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      minimum_age: 21,
      session_receipt_hours: 24,
      required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }],
    },
  }),
  residency_us: pack({
    id: "residency_us",
    display_name: "Residency / jurisdiction eligibility",
    holder_explanation: "Confirm a residency_country credential is active. The partner learns whether the jurisdiction check passed, not your full address.",
    required_claims: ["residency_country"],
    minimum_assurance: "L2",
    receipt_lifetime_hours: 48,
    intended_use_examples: [
      "Region limited product access",
      "Jurisdictional eligibility before a partner applies its own legal review",
    ],
    partner_receives: "Signed result residency_check_passed. Not a tax, visa, or sanctions determination.",
    partner_does_not_receive: ["street address", "government ID images", "legal name", "email"],
    production_suitability: "production_eligible_after_safety_gate",
    disclosed_result: "residency_check_passed",
    receipt_claim: "jurisdiction_met",
    reuse_policy: "time_bound",
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 48,
      required_claims: [{ claim_type: "residency_country", min_assurance: "L2" }],
    },
  }),
  wallet_control: pack({
    id: "wallet_control",
    display_name: "Wallet control eligibility",
    holder_explanation: "Prove control of the wallet bound to your Abraxas account. Google sign-in alone is not wallet control.",
    required_claims: ["wallet_binding_confirmed"],
    minimum_assurance: "L1",
    receipt_lifetime_hours: 12,
    intended_use_examples: [
      "Protocol actions that require a bound wallet",
      "Collector or trading venues that only need proof of control, not a profile",
    ],
    partner_receives: "Signed result wallet_control_confirmed. Not an onchain balance or trading history.",
    partner_does_not_receive: ["private keys", "seed phrases", "email", "government ID images"],
    production_suitability: "production_eligible_after_safety_gate",
    disclosed_result: "wallet_control_confirmed",
    receipt_claim: "wallet_binding_confirmed",
    reuse_policy: "session",
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 12,
      required_claims: [{ claim_type: "wallet_binding_confirmed", min_assurance: "L1" }],
    },
  }),
  membership_credential: pack({
    id: "membership_credential",
    display_name: "Membership / credential eligibility",
    holder_explanation: "Confirm you hold an active Abraxas issued identity credential accepted by this policy.",
    required_claims: ["identity_verified"],
    minimum_assurance: "L2",
    receipt_lifetime_hours: 12,
    intended_use_examples: [
      "Member only surfaces that only need an active credential flag",
      "Clubs or protocols that already issue their own membership off platform",
    ],
    partner_receives: "Signed result credential_active. Not a member directory or profile.",
    partner_does_not_receive: ["email", "legal name", "government ID images", "membership documents"],
    production_suitability: "production_eligible_after_safety_gate",
    disclosed_result: "credential_active",
    receipt_claim: "identity_verified",
    reuse_policy: "session",
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 12,
      required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }],
    },
  }),
  collector_redemption: pack({
    id: "collector_redemption",
    display_name: "Collector or redemption eligibility",
    holder_explanation: "Confirm an active product_eligibility credential for this partner's configured action. This is not a marketplace, pack opening, or trading product.",
    required_claims: ["product_eligibility"],
    minimum_assurance: "L1",
    receipt_lifetime_hours: 24,
    intended_use_examples: [
      "Redemption windows that only need eligible / not eligible",
      "Allowlists for collectible or tokenized asset access without storing a buyer profile",
    ],
    partner_receives: "Signed result redemption_eligible. Not inventory, offers, or identity documents.",
    partner_does_not_receive: ["date of birth", "government ID images", "wallet seed", "email"],
    production_suitability: "sandbox_only",
    disclosed_result: "redemption_eligible",
    receipt_claim: "product_eligibility",
    reuse_policy: "time_bound",
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 24,
      product_eligibility_action: "redemption_or_access",
      required_claims: [{ claim_type: "product_eligibility", min_assurance: "L1" }],
    },
  }),
  identity_liveness: pack({
    id: "identity_liveness",
    display_name: "Identity plus liveness eligibility",
    holder_explanation: "Confirm an identity credential and a liveness check. Google sign-in is not liveness and is not identity evidence.",
    required_claims: ["identity_verified", "liveness_passed"],
    minimum_assurance: "L2",
    receipt_lifetime_hours: 24,
    intended_use_examples: [
      "Higher assurance partner gates that still only need a boolean result",
      "Account recovery or high risk actions defined by the partner",
    ],
    partner_receives: "Signed result identity_and_liveness_met. Not selfies, ID images, or biometric templates.",
    partner_does_not_receive: ["selfie", "government ID images", "biometric templates", "email", "legal name"],
    production_suitability: "production_eligible_after_safety_gate",
    disclosed_result: "identity_and_liveness_met",
    receipt_claim: "identity_verified",
    reuse_policy: "time_bound",
    permitted_methods: ["passport"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 24,
      required_claims: [
        { claim_type: "identity_verified", min_assurance: "L2" },
        { claim_type: "liveness_passed", min_assurance: "L2" },
      ],
    },
  }),
  sandbox_economic_demo: pack({
    id: "sandbox_economic_demo",
    display_name: "Sandbox economic demo (not age verification)",
    holder_explanation:
      "Sandbox / testnet demonstration only. This pack proves a labeled demo eligibility flag so Preview can exercise receipt-gated settlement. It is not age verification, not identity verification, and not usable in Production.",
    required_claims: ["product_eligibility"],
    minimum_assurance: "L1",
    receipt_lifetime_hours: 2,
    intended_use_examples: [
      "Preview Circle Arc testnet receipt demonstration",
      "Sandbox harness for settlement without claiming a real age check",
    ],
    partner_receives: "Signed result sandbox_demo_eligible. Not an age finding and not a Production authorization.",
    partner_does_not_receive: ["date of birth", "government ID images", "legal name", "email", "wallet address"],
    production_suitability: "sandbox_only",
    disclosed_result: "sandbox_demo_eligible",
    receipt_claim: "product_eligibility",
    reuse_policy: "session",
    permitted_methods: ["reuse_existing_proof", "partner_age_check", "privacy_preserving"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 2,
      product_eligibility_action: "sandbox_economic_demo",
      required_claims: [{ claim_type: "product_eligibility", min_assurance: "L1" }],
    },
  }),
  sandbox_institutional_protocol_access: pack({
    id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
    display_name: "Sandbox institutional protocol access",
    holder_explanation:
      `${SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE} The holder completes the existing organization or authorized-signer eligibility flow. The partner receives an opaque institutional result bound to activate_protocol_access, not a company file.`,
    required_claims: [],
    minimum_assurance: "L2",
    receipt_lifetime_hours: 24,
    intended_use_examples: [
      "Sandbox app pinned to the reviewed institutional protocol-access policy",
      `Later binding of a fresh sandbox result to a V2 Solana devnet gate for ${SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE}`,
    ],
    partner_receives:
      "Signed sandbox institutional result plus opaque commitments. Not a legal name, KYB file, or production authorization.",
    partner_does_not_receive: [
      "legal name",
      "company registration number",
      "documents",
      "beneficial owners",
      "address",
      "wallet",
      "provider payload",
      "raw receipt",
      "callback URL",
      "secret",
    ],
    production_suitability: "sandbox_only",
    disclosed_result: "organization_eligible",
    receipt_claim: "organization_eligible",
    reuse_policy: "time_bound",
    permitted_methods: ["privacy_preserving"],
    rules: {
      ...SANDBOX,
      session_receipt_hours: 24,
      product_eligibility_action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      allowed_purposes: [SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION],
      enforce_issuer_trust: true,
      required_claims: [{
        claim_type: "organization_eligible",
        min_assurance: "L2",
        accepted_issuers: [SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ISSUER],
      }],
    },
  }),
};

export const POLICY_PACK_LIST = Object.values(POLICY_PACKS);

export function isPolicyPackId(value: string): value is PolicyPackId {
  return value in POLICY_PACKS;
}

export function resolvePolicyPack(id: string): PolicyPack | null {
  if (!isPolicyPackId(id)) return null;
  return POLICY_PACKS[id];
}

export function policyPackIsSandboxOnly(pack: PolicyPack): boolean {
  return pack.production_suitability === "sandbox_only";
}

export function policyPackRequiresIdentityEvidence(pack: PolicyPack): boolean {
  return pack.required_claims.some((claim) =>
    claim === "identity_verified" || claim === "liveness_passed" || claim === "government_id_verified",
  );
}

/** Resolve a catalog pack from a Launchpad policy id such as partner-age_21_retail-v1. */
export function inferPolicyPackFromPolicyId(policyId: string): PolicyPack | null {
  const trimmed = policyId.trim();
  const direct = resolvePolicyPack(trimmed);
  if (direct) return direct;
  const packs = [...POLICY_PACK_LIST].sort((a, b) => b.id.length - a.id.length);
  for (const pack of packs) {
    if (trimmed.includes(pack.id)) return pack;
  }
  return null;
}

export function policyPackIsEconomicDemo(pack: PolicyPack): boolean {
  return pack.id === "sandbox_economic_demo";
}

export function policyPackIsInstitutionalProtocolAccess(pack: PolicyPack): boolean {
  return pack.id === SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID;
}
