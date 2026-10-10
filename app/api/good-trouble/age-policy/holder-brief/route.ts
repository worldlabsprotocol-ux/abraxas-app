// FILE: app/api/good-trouble/age-policy/holder-brief/route.ts
// Holder disclosure for Solana-native Good Trouble age-21 policy.

import { NextResponse } from "next/server";
import { GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID } from "@/lib/goodTrouble/goodTroubleSolanaPolicyIds";
import { GOOD_TROUBLE_CANONICAL_RESULT_FAMILY } from "@/lib/goodTrouble/canonicalProductionConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    policy_id: GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID,
    disclosed_result: GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
    identity_required: true,
    minimum_assurance: "L2",
    self_attested_age_allowed: false,
    wallet_chain: "solana",
  });
}
