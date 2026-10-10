// FILE: lib/goodTrouble/resolveGoodTroublePurchasePolicy.ts

import { isSolanaNativeProductEnabled } from "@/lib/auth/solanaNative/featureFlag";
import { GOOD_TROUBLE_CANONICAL_POLICY_ID } from "@/lib/goodTrouble/canonicalProductionConfig";
import { GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID } from "@/lib/goodTrouble/goodTroubleSolanaPolicyIds";

export function resolveGoodTroublePurchasePolicyId(
  env: Record<string, string | undefined> = process.env,
): string {
  if (isSolanaNativeProductEnabled(env)) {
    return GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID;
  }
  return GOOD_TROUBLE_CANONICAL_POLICY_ID;
}
