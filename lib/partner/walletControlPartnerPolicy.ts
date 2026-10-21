// FILE: lib/partner/walletControlPartnerPolicy.ts
// Detect wallet-control partner policies for holder-native trust paths.

import { normalizePartnerFlowSubject } from "@/lib/auth/sessionSubject";
import { resolveActiveClaimsForRuntime } from "@/lib/credentials/activeClaims.server";
import {
  inferPolicyPackFromPolicyId,
  type PolicyPack,
} from "@/lib/partner/launchpad/policyPacks";
import type { PartnerPolicyRules } from "@/lib/policy/types";
import { findProductionPolicyRules } from "@/lib/policy/productionPolicyContract";
import { WALLET_CONTROL_CLAIM_TYPE } from "@/lib/walletControl/contract";

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

/** Wallet-control completion uses active wallet_binding_confirmed evidence, not passport JTIs. */
export async function resolveWalletControlCompletionCredentialRef(
  subjectId: string,
): Promise<string | null> {
  const subject = normalizePartnerFlowSubject(subjectId);
  const claims = await resolveActiveClaimsForRuntime(subject);
  const walletClaim = claims.find(
    (claim) => claim.claim_type === WALLET_CONTROL_CLAIM_TYPE && claim.status === "active",
  );
  if (!walletClaim) return null;
  if (walletClaim.evidence_reference?.trim()) {
    return walletClaim.evidence_reference.trim();
  }
  if (walletClaim.id) {
    return `urn:abraxas:claim:${walletClaim.id}`;
  }
  return null;
}
