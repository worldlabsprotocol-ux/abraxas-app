import { describe, expect, it } from "vitest";
import {
  ABRA_CHECKOUT_STATUS, ABRA_SOLANA_MINT,
  abraServiceCreditEligibility, createAbraPaymentQuote,
} from "./abraServiceCredits";

describe("ABRA service credit foundation", () => {
  it("pins the reviewed mint and keeps quoting disabled", () => {
    expect(ABRA_SOLANA_MINT).toBe("5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS");
    expect(ABRA_CHECKOUT_STATUS).toBe("disabled_pending_verified_rate_and_settlement");
    expect(createAbraPaymentQuote).toThrow("abra_checkout_disabled");
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
});

