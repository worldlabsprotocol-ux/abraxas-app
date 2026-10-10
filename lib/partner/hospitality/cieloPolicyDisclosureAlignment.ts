// FILE: lib/partner/hospitality/cieloPolicyDisclosureAlignment.ts
// Policy truth: cielo-verified-guest-v1 ≠ age_21_retail (Build #503 disclosure fix).

import {
  cieloPolicyEquivalentToAge21Retail,
  cieloVerifiedGuestV1Predicates,
  age21RetailPackPredicates,
} from "@/lib/cielo/cieloVerifiedGuestPolicyContract";

export function describeCieloPolicyDisclosureAlignment(): {
  pinned_policy_id: string;
  policies_equivalent: boolean;
  holder_disclosure_source: "cielo_verified_guest_v1_contract";
  cielo_disclosed_result: string;
  age_21_retail_disclosed_result: string;
  immutable_policy_note: string;
} {
  const cielo = cieloVerifiedGuestV1Predicates();
  const age21 = age21RetailPackPredicates();
  return {
    pinned_policy_id: cielo.policy_id,
    policies_equivalent: cieloPolicyEquivalentToAge21Retail(),
    holder_disclosure_source: "cielo_verified_guest_v1_contract",
    cielo_disclosed_result: cielo.disclosed_result,
    age_21_retail_disclosed_result: age21.disclosed_result,
    immutable_policy_note:
      "cielo-verified-guest-v1 is unchanged. Holders see wallet/account/consent pilot requirements — not age_21_retail. "
      + "Operators adopting true 21+ eligibility must pin age_21_retail via Launchpad and a new policy version id.",
  };
}
