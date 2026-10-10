// FILE: lib/cielo/cieloVerifiedGuestPolicyContract.ts
// Authoritative predicates for immutable cielo-verified-guest-v1 (holder disclosure must match).

import { CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/cieloIds";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";

/** Matches supabase/migrations/026_cielo_verified_rate.sql rules_json (immutable v1). */
export const CIELO_VERIFIED_GUEST_V1_RULES = {
  required_claims: [
    { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L3" as const },
  ],
  account_required: true,
  profile_required: true,
  consent_required: true,
  identity_optional: true,
} as const;

export const CIELO_V1_POLICY_VERSION = 1;

/** What Cielo receives after consent — pilot wallet/account gate, not age_21_retail. */
export const CIELO_V1_DISCLOSED_RESULT = "verified_guest_pilot_pass";

export const CIELO_V1_HOLDER_EXPLANATION =
  "Cielo requests a pilot verified-guest check: active Passport account, complete profile, "
  + "fresh wallet binding (signed challenge), and your consent. "
  + "Identity credentials may strengthen your case but are optional under this policy version. "
  + "This is not a 21+ age certificate and not booking confirmation.";

export type PolicyPredicateSnapshot = {
  policy_id: string;
  immutable_version: number;
  minimum_age: number | null;
  required_claim_types: string[];
  min_assurance: string | null;
  max_age_hours_wallet_binding: number | null;
  account_required: boolean;
  profile_required: boolean;
  consent_required: boolean;
  identity_optional: boolean;
  disclosed_result: string;
  decision_semantics: string;
};

export function cieloVerifiedGuestV1Predicates(): PolicyPredicateSnapshot {
  return {
    policy_id: CIELO_VERIFIED_GUEST_POLICY_ID,
    immutable_version: CIELO_V1_POLICY_VERSION,
    minimum_age: null,
    required_claim_types: ["wallet_binding_confirmed"],
    min_assurance: "L3",
    max_age_hours_wallet_binding: 720,
    account_required: true,
    profile_required: true,
    consent_required: true,
    identity_optional: true,
    disclosed_result: CIELO_V1_DISCLOSED_RESULT,
    decision_semantics: "approved | manual_review | not_eligible (Cielo adapter gates)",
  };
}

export function age21RetailPackPredicates(packId: PolicyPackId = "age_21_retail"): PolicyPredicateSnapshot {
  const pack = POLICY_PACKS[packId];
  return {
    policy_id: "(Launchpad-pinned per tenant)",
    immutable_version: pack.catalog_version,
    minimum_age: 21,
    required_claim_types: pack.required_claims,
    min_assurance: pack.minimum_assurance,
    max_age_hours_wallet_binding: null,
    account_required: Boolean(pack.rules.account_required),
    profile_required: false,
    consent_required: Boolean(pack.rules.consent_required),
    identity_optional: false,
    disclosed_result: pack.disclosed_result,
    decision_semantics: "policy pack age threshold via identity_verified claims",
  };
}

export function cieloPolicyEquivalentToAge21Retail(): boolean {
  const a = cieloVerifiedGuestV1Predicates();
  const b = age21RetailPackPredicates();
  return (
    a.minimum_age === b.minimum_age
    && a.required_claim_types.join() === b.required_claim_types.join()
    && a.min_assurance === b.min_assurance
    && a.disclosed_result === b.disclosed_result
  );
}

export function buildCieloHolderBriefInput() {
  return {
    partnerId: "cielo",
    partnerName: "Cielo Sunrise",
    policyId: CIELO_VERIFIED_GUEST_POLICY_ID,
    purpose: "cielo_verified_rate",
    disclosedResult: CIELO_V1_DISCLOSED_RESULT,
    userExplanation: CIELO_V1_HOLDER_EXPLANATION,
    environment: "production" as const,
  };
}
