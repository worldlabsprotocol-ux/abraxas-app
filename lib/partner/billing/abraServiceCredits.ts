// ABRA's financial contract. No quote or payment endpoint is enabled here.
// Dollar values reuse partnerCommercialPlans; token quantity has no default rate.
import { resolvePartnerCommercialPlan } from "@/lib/partner/partnerCommercialPlans";

export const ABRA_SOLANA_MINT = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
export const ABRA_CHECKOUT_STATUS = "disabled_pending_verified_rate_and_settlement" as const;

export type AbraCreditEligibility =
  | { eligible: true; currency: "USD"; charge_cents: number }
  | { eligible: false; reason: "sandbox_free" | "custom_pricing_required" | "invalid_amount" };

export function abraServiceCreditEligibility(input: {
  planId: string;
  environment: "sandbox" | "production";
  chargeCents: number;
}): AbraCreditEligibility {
  if (input.environment === "sandbox") return { eligible: false, reason: "sandbox_free" };
  const plan = resolvePartnerCommercialPlan(input.planId);
  if (plan.id === "enterprise") return { eligible: false, reason: "custom_pricing_required" };
  if (plan.id === "sandbox") return { eligible: false, reason: "sandbox_free" };
  if (!Number.isSafeInteger(input.chargeCents) || input.chargeCents <= 0) {
    return { eligible: false, reason: "invalid_amount" };
  }
  return { eligible: true, currency: "USD", charge_cents: input.chargeCents };
}

// Explicitly fail closed until a server-authoritative source and settlement
// verifier are configured. This must never calculate ABRA from a guessed rate.
export function createAbraPaymentQuote(): never {
  throw new Error("abra_checkout_disabled");
}

