import { describe, expect, it } from "vitest";
import {
  ABRA_CHECKOUT_STATUS, ABRA_SOLANA_MINT,
  abraServiceCreditEligibility, createAbraPaymentQuote, assertAbraCheckoutEnabled,
} from "./abraServiceCredits";

describe("ABRA service credit foundation", () => {
  it("pins the reviewed mint and keeps quoting disabled", () => {
    expect(ABRA_SOLANA_MINT).toBe("5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS");
    expect(ABRA_CHECKOUT_STATUS).toBe("disabled_pending_verified_rate_and_settlement");
    expect(assertAbraCheckoutEnabled).toThrow("abra_checkout_disabled");
  });
  it("never charges sandbox usage or custom enterprise pricing", () => {
    expect(abraServiceCreditEligibility({ planId: "launch", environment: "sandbox", chargeCents: 100 }))
      .toEqual({ eligible: false, reason: "sandbox_free" });
    expect(abraServiceCreditEligibility({ planId: "enterprise", environment: "production", chargeCents: 100 }))
      .toEqual({ eligible: false, reason: "custom_pricing_required" });
  });
  it("requires a positive, integral USD-cent amount for paid plans", () => {
    expect(abraServiceCreditEligibility({ planId: "launch", environment: "production", chargeCents: 0 }))
      .toEqual({ eligible: false, reason: "invalid_amount" });
    expect(abraServiceCreditEligibility({ planId: "scale", environment: "production", chargeCents: 250 }))
      .toEqual({ eligible: true, currency: "USD", charge_cents: 250 });
  });
  it("creates a bounded quote only from a fresh, identified liquid rate", () => {
    const input = {
      intentId: "intent-1", partnerId: "partner-1", applicationId: "app-1",
      recipient: "recipient", reference: "reference", tokenProgram: "program",
      tokenDecimals: 6, creditCents: 1000, expectedSource: "approved-feed",
      nowMs: 1_700_000_000_000,
      observation: { mint: ABRA_SOLANA_MINT, source: "approved-feed",
        observed_at: new Date(1_700_000_000_000).toISOString(),
        usd_micro_per_token: "1000000", liquidity_usd: 100_000, spread_bps: 20 },
    };
    const quote = createAbraPaymentQuote(input);
    expect(quote.token_amount_raw).toBe("10050000");
    expect(quote.credit_cents).toBe(1000);
    expect(Date.parse(quote.expires_at) - input.nowMs).toBe(120_000);
    expect(() => createAbraPaymentQuote({ ...input,
      observation: { ...input.observation, mint: "wrong" } })).toThrow("abra_quote_unavailable");
    expect(() => createAbraPaymentQuote({ ...input,
      observation: { ...input.observation, observed_at: new Date(input.nowMs - 31_000).toISOString() } }))
      .toThrow("abra_quote_unavailable");
    expect(() => createAbraPaymentQuote({ ...input,
      observation: { ...input.observation, liquidity_usd: 10 } })).toThrow("abra_quote_unavailable");
    expect(() => createAbraPaymentQuote({ ...input,
      observation: { ...input.observation, source: "unapproved-feed" } })).toThrow("abra_quote_unavailable");
    expect(() => createAbraPaymentQuote({ ...input,
      observation: { ...input.observation, spread_bps: 101 } })).toThrow("abra_quote_unavailable");
    expect(() => createAbraPaymentQuote({ ...input, slippageBps: 101 }))
      .toThrow("abra_quote_unavailable");
  });
});

