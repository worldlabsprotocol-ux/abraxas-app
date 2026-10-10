// FILE: app/api/cielo/verified-rate/holder-brief/route.ts
// Modern holder disclosure brief for Cielo verified-guest flow (server-derived).

import { NextResponse } from "next/server";
import { buildHolderRequestBrief } from "@/lib/partner/holderExperience/brief";
import { CIELO_SUNRISE_RENTAL_TENANT } from "@/lib/partner/hospitality/rentalOperatorTenants";
import {
  getRentalOperatorPolicyPack,
  rentalOperatorHolderPurpose,
  RENTAL_OPERATOR_BOOKING_BOUNDARY,
} from "@/lib/partner/hospitality/rentalOperatorContract";

export async function GET() {
  const pack = getRentalOperatorPolicyPack(CIELO_SUNRISE_RENTAL_TENANT.policyPackId);
  const brief = buildHolderRequestBrief({
    partnerId: CIELO_SUNRISE_RENTAL_TENANT.partnerId,
    partnerName: CIELO_SUNRISE_RENTAL_TENANT.displayName,
    policyId: CIELO_SUNRISE_RENTAL_TENANT.policyId,
    purpose: CIELO_SUNRISE_RENTAL_TENANT.consentPurpose,
    disclosedResult: pack.disclosed_result,
    userExplanation: rentalOperatorHolderPurpose(CIELO_SUNRISE_RENTAL_TENANT),
    environment: "production",
  });

  return NextResponse.json({
    brief,
    policy_id: CIELO_SUNRISE_RENTAL_TENANT.policyId,
    policy_pack_id: CIELO_SUNRISE_RENTAL_TENANT.policyPackId,
    booking_boundary: RENTAL_OPERATOR_BOOKING_BOUNDARY,
  });
}
