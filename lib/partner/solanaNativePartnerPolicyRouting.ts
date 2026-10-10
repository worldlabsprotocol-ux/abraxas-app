// FILE: lib/partner/solanaNativePartnerPolicyRouting.ts
// Route immutable legacy partner policies to Solana-native successors for Phantom holders.

import { CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/cieloIds";
import { CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID } from "@/lib/cielo/cieloSolanaPolicyIds";
import {
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID } from "@/lib/goodTrouble/goodTroubleSolanaPolicyIds";
import type { PartnerFlowHolderMode } from "@/lib/partner/partnerFlowHolderContext";

export type EffectivePartnerPolicyResolution = {
  policyId: string;
  requestedPolicyId: string;
  routed: boolean;
  successorPolicyId?: string;
};

const LEGACY_TO_SOLANA: Record<string, string> = {
  [CIELO_VERIFIED_GUEST_POLICY_ID]: CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID,
  [GOOD_TROUBLE_CANONICAL_POLICY_ID]: GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID,
};

export function resolveEffectivePartnerPolicyId(input: {
  requestedPolicyId: string;
  holderMode: PartnerFlowHolderMode;
}): EffectivePartnerPolicyResolution {
  const requested = input.requestedPolicyId.trim();
  if (input.holderMode !== "solana_native") {
    return { policyId: requested, requestedPolicyId: requested, routed: false };
  }

  if (
    requested === CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID
    || requested === GOOD_TROUBLE_AGE_21_RETAIL_SOLANA_POLICY_ID
  ) {
    return { policyId: requested, requestedPolicyId: requested, routed: false };
  }

  const successor = LEGACY_TO_SOLANA[requested];
  if (successor) {
    return {
      policyId: successor,
      requestedPolicyId: requested,
      routed: true,
      successorPolicyId: successor,
    };
  }

  return { policyId: requested, requestedPolicyId: requested, routed: false };
}

/** Solana holders must not silently use L0 self-attest purchase policy when a successor exists. */
export function solanaHolderPolicySubstitutionAllowed(
  requestedPolicyId: string,
  effectivePolicyId: string,
): boolean {
  if (requestedPolicyId === effectivePolicyId) return true;
  return LEGACY_TO_SOLANA[requestedPolicyId.trim()] === effectivePolicyId.trim();
}
