// FILE: lib/partner/hospitality/cieloPolicyDisclosureAlignment.ts
// Documents holder disclosure vs immutable cielo-verified-guest-v1 DB rules (no silent policy mutation).

import { CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/cieloIds";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import { RENTAL_OPERATOR_DEFAULT_POLICY_PACK_ID } from "@/lib/partner/hospitality/rentalOperatorContract";

/**
 * Cielo holder UI and Launchpad onboarding use age_21_retail disclosure vocabulary.
 * The pinned production policy row remains cielo-verified-guest-v1 until an operator publishes
 * a new immutable version (e.g. cielo-verified-guest-v2) via policy change control — never in-place edits.
 */
export function describeCieloPolicyDisclosureAlignment(): {
  pinned_policy_id: typeof CIELO_VERIFIED_GUEST_POLICY_ID;
  disclosure_policy_pack_id: typeof RENTAL_OPERATOR_DEFAULT_POLICY_PACK_ID;
  disclosed_result: string;
  immutable_policy_note: string;
} {
  const pack = POLICY_PACKS[RENTAL_OPERATOR_DEFAULT_POLICY_PACK_ID];
  return {
    pinned_policy_id: CIELO_VERIFIED_GUEST_POLICY_ID,
    disclosure_policy_pack_id: RENTAL_OPERATOR_DEFAULT_POLICY_PACK_ID,
    disclosed_result: pack.disclosed_result,
    immutable_policy_note:
      "DB rules for cielo-verified-guest-v1 (wallet L3, account, consent) are unchanged; "
      + "age_21_retail describes operator-facing disclosure for new Launchpad tenants. "
      + "Successor policies require versioning, not silent rules_json edits.",
  };
}
