// FILE: lib/walletControl/partnerClaims.ts
// Partner-safe decision claim projections — no wallet graph leakage.

import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { WALLET_CONTROL_CLAIM_TYPE } from "@/lib/walletControl/contract";

export function sanitizePartnerDecisionClaims(
  claimsJson: Record<string, unknown>,
  policyId: string,
): Record<string, unknown> {
  const pack = inferPolicyPackFromPolicyId(policyId);
  if (pack?.id !== "wallet_control") return claimsJson;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(claimsJson)) {
    if (key === WALLET_CONTROL_CLAIM_TYPE && value && typeof value === "object") {
      const claim = value as Record<string, unknown>;
      sanitized[key] = {
        claim_type: claim.claim_type ?? WALLET_CONTROL_CLAIM_TYPE,
        assurance_level: claim.assurance_level ?? null,
        issued_at: claim.issued_at ?? null,
        expires_at: claim.expires_at ?? null,
        issuer_id: claim.issuer_id ?? null,
        wallet_control_confirmed: true,
      };
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}
