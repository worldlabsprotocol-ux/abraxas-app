import { resolvePartnerCommercialPlan } from "@/lib/partner/partnerCommercialPlans";

export const ABRA_SOLANA_MINT = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
export const ABRA_CHECKOUT_STATUS = "disabled_pending_verified_rate_and_settlement" as const;
export type AbraCreditEligibility =
  | { eligible: true; currency: "USD"; charge_cents: number }
  | { eligible: false; reason: "sandbox_free" | "custom_pricing_required" | "invalid_amount" };

export function abraServiceCreditEligibility(input: {
  planId: string; environment: "sandbox" | "production"; chargeCents: number;
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

export type AbraRateObservation = {
  mint: string; source: string; observed_at: string; usd_micro_per_token: string;
  liquidity_usd: number; spread_bps: number;
};
export type AbraPaymentQuote = {
  intent_id: string; partner_id: string; application_id: string;
  mint: typeof ABRA_SOLANA_MINT; token_program: string;
  recipient: string; reference: string; credit_cents: number;
  token_amount_raw: string; rate_source: string; rate_observed_at: string;
  slippage_bps: number; expires_at: string;
};
export class AbraQuoteUnavailable extends Error {
  constructor() { super("abra_quote_unavailable"); }
}
function ceilDiv(a: bigint, b: bigint): bigint { return (a + b - BigInt(1)) / b; }

export function createAbraPaymentQuote(input: {
  intentId: string; partnerId: string; applicationId: string;
  recipient: string; reference: string; tokenProgram: string; tokenDecimals: number;
  creditCents: number; observation: AbraRateObservation; expectedSource: string;
  nowMs: number; slippageBps?: number;
}): AbraPaymentQuote {
  const { observation: rate, nowMs } = input;
  const observedMs = Date.parse(rate.observed_at);
  const bps = input.slippageBps ?? 50;
  if (rate.mint !== ABRA_SOLANA_MINT || !rate.source || rate.source !== input.expectedSource
    || !Number.isFinite(observedMs) || observedMs > nowMs + 5_000 || nowMs - observedMs > 30_000
    || !/^\d+$/.test(rate.usd_micro_per_token) || BigInt(rate.usd_micro_per_token) <= BigInt(0)
    || !Number.isFinite(rate.liquidity_usd) || rate.liquidity_usd < 10_000
    || !Number.isInteger(rate.spread_bps) || rate.spread_bps < 0 || rate.spread_bps > 100
    || !Number.isInteger(bps) || bps < 0 || bps > 100
    || !Number.isInteger(input.tokenDecimals) || input.tokenDecimals < 0 || input.tokenDecimals > 18
    || !Number.isSafeInteger(input.creditCents) || input.creditCents <= 0
    || !input.intentId || !input.partnerId || !input.applicationId || !input.recipient || !input.reference
    || !input.tokenProgram) throw new AbraQuoteUnavailable();
  // USD cents are converted to microUSD, rounded up to raw token units, and
  // adjusted by an explicit 0-1% quote allowance.
  let tokenBase = BigInt(1);
  for (let i = 0; i < input.tokenDecimals; i += 1) tokenBase *= BigInt(10);
  const raw = ceilDiv(BigInt(input.creditCents) * BigInt(10_000) * tokenBase
    * BigInt(10_000 + bps), BigInt(rate.usd_micro_per_token) * BigInt(10_000));
  if (raw <= BigInt(0) || raw > BigInt("9223372036854775807")) throw new AbraQuoteUnavailable();
  return {
    intent_id: input.intentId, partner_id: input.partnerId, application_id: input.applicationId,
    mint: ABRA_SOLANA_MINT, token_program: input.tokenProgram,
    recipient: input.recipient, reference: input.reference, credit_cents: input.creditCents,
    token_amount_raw: raw.toString(), rate_source: rate.source,
    rate_observed_at: rate.observed_at, slippage_bps: bps,
    expires_at: new Date(nowMs + 2 * 60_000).toISOString(),
  };
}

export function assertAbraCheckoutEnabled(): never {
  // This build does not authorize live checkout. No env flag overrides it.
  throw new Error("abra_checkout_disabled");
}

