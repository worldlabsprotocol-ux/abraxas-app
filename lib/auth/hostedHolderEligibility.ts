// FILE: lib/auth/hostedHolderEligibility.ts
// Which hosted partner flows may bootstrap an Abraxas-native holder session without Google first.

import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID } from "@/lib/goodTrouble/goodTroubleSolanaPolicyIds";
import { CIELO_PARTNER_ID, CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/cieloIds";
import { CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID } from "@/lib/cielo/cieloSolanaPolicyIds";
import { isGoodTroubleBrowseFlow } from "@/lib/partner/goodTroubleBrowseFlow";

export interface HostedHolderFlowContext {
  partnerId: string;
  policyId: string;
  purpose?: string | null;
}

/** Presentation copy for the verification-first primary action. */
export const HOSTED_HOLDER_PRIMARY_ACTION = "Continue verification";

export const HOSTED_HOLDER_OPTIONAL_SIGN_IN_LABEL =
  "Already have a Passport? Sign in to reuse verified evidence";

export function isHostedHolderBootstrapEligible(input: HostedHolderFlowContext): boolean {
  const partnerId = input.partnerId.trim();
  const policyId = input.policyId.trim();
  if (!partnerId || !policyId) return false;

  if (isGoodTroubleBrowseFlow({ partnerId, policyId, purpose: input.purpose })) {
    return true;
  }

  if (
    partnerId === GOOD_TROUBLE_CANONICAL_PARTNER_ID
    && (
      policyId === GOOD_TROUBLE_CANONICAL_POLICY_ID
      || policyId === GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID
    )
  ) {
    return true;
  }

  if (
    partnerId === CIELO_PARTNER_ID
    && (
      policyId === CIELO_VERIFIED_GUEST_POLICY_ID
      || policyId === CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID
    )
  ) {
    return true;
  }

  return false;
}
