// FILE: lib/partner/walletControlPartnerPolicy.ts
// Detect wallet-control partner policies for holder-native trust paths.

import {
  inferPolicyPackFromPolicyId,
  type PolicyPack,
} from "@/lib/partner/launchpad/policyPacks";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import { findProductionPolicyRules } from "@/lib/policy/productionPolicyContract";

export function policyPackIsWalletControl(pack: PolicyPack | null): boolean {
  return pack?.id === "wallet_control";
}

export function isWalletControlPartnerPolicy(policyId: string): boolean {
  const pack = inferPolicyPackFromPolicyId(policyId);
  return policyPackIsWalletControl(pack);
}

export function resolveWalletControlPolicyRules(policyId: string): PartnerPolicyRules | null {
  return findProductionPolicyRules(policyId)
    ?? inferPolicyPackFromPolicyId(policyId)?.rules
    ?? null;
}
