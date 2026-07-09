// FILE: lib/passport/tier3Claims.ts
// Transaction-specific eligibility — Tier 3 claim taxonomy.

export const TIER3_CLAIM_TYPES = [
  "screening_outcome",
  "accredited_status",
  "kyb_verified",
  "transfer_eligibility",
  "product_eligibility",
  "asset_ownership_reviewed",
] as const;

export type Tier3ClaimType = (typeof TIER3_CLAIM_TYPES)[number];

export function activeTier3Claims(types: string[]): Tier3ClaimType[] {
  return TIER3_CLAIM_TYPES.filter(t => types.includes(t));
}

export function hasTransactionEligibility(types: string[]): boolean {
  return activeTier3Claims(types).length > 0;
}

export const TIER3_CLAIM_LABELS: Record<Tier3ClaimType, string> = {
  screening_outcome: "Sanctions screening",
  accredited_status: "Accredited investor",
  kyb_verified: "Business verification (KYB)",
  transfer_eligibility: "Transfer eligibility",
  product_eligibility: "Product suitability",
  asset_ownership_reviewed: "Asset ownership review",
};
