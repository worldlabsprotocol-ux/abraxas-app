// FILE: app/api/cielo/verified-rate/holder-brief/route.ts
// Holder disclosure for the actual immutable cielo-verified-guest-v1 policy (not age_21_retail).

import { NextResponse } from "next/server";
import { buildHolderRequestBrief } from "@/lib/partner/holderExperience/brief";
import { RENTAL_OPERATOR_BOOKING_BOUNDARY } from "@/lib/partner/hospitality/rentalOperatorContract";
import {
  buildCieloHolderBriefInput,
  cieloVerifiedGuestV1Predicates,
  cieloPolicyEquivalentToAge21Retail,
} from "@/lib/cielo/cieloVerifiedGuestPolicyContract";
import { CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/cieloIds";

export async function GET() {
  const predicates = cieloVerifiedGuestV1Predicates();
  const brief = buildHolderRequestBrief(buildCieloHolderBriefInput());

  return NextResponse.json({
    brief,
    policy_id: CIELO_VERIFIED_GUEST_POLICY_ID,
    policy_version: predicates.immutable_version,
    disclosed_result: predicates.disclosed_result,
    predicates,
    equivalent_to_age_21_retail: cieloPolicyEquivalentToAge21Retail(),
    booking_boundary: RENTAL_OPERATOR_BOOKING_BOUNDARY,
  });
}
