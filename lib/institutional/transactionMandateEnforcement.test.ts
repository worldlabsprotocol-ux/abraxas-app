// FILE: lib/institutional/transactionMandateEnforcement.test.ts

import { describe, expect, it } from "vitest";
import {
  evaluateTransactionMandate,
  type SyntheticInstitutionalMandate,
  walletControlReceiptSatisfiesMandate,
} from "./transactionMandateEnforcement";

const BASE_MANDATE: SyntheticInstitutionalMandate = {
  mandate_id: "mandate_synthetic_001",
  issuer_id: "issuer_fund_alpha",
  tenant_id: "tenant_fund_alpha",
  policy_id: "institutional_signing_mandate_v1",
  policy_version: 1,
  authorized_actor_wallet: "SignerWallet11111111111111111111111111111111",
  transaction_scope: {
    kind: "collateral_release",
    max_amount_usd: 250_000,
    destination_fingerprint: "dest_vault_b_fingerprint",
  },
  not_before_iso: "2026-01-01T00:00:00.000Z",
  not_after_iso: "2027-01-01T00:00:00.000Z",
  revoked_at_iso: null,
};

const TX = {
  kind: "collateral_release" as const,
  amount_usd: 250_000,
  destination_fingerprint: "dest_vault_b_fingerprint",
  actor_wallet: "SignerWallet11111111111111111111111111111111",
  tenant_id: "tenant_fund_alpha",
  policy_id: "institutional_signing_mandate_v1",
  policy_version: 1,
};

describe("transaction mandate enforcement (Build 883)", () => {
  it("denies when authoritative mandate is missing", () => {
    const result = evaluateTransactionMandate({
      mandate: null,
      transaction: TX,
      now: new Date("2026-06-01T12:00:00.000Z"),
      abraxas_receipt_verified: true,
      abraxas_outcome: "permit",
    });
    expect(result.outcome).toBe("indeterminate");
    expect(result.reasons).toContain("authoritative_mandate_missing");
  });

  it("permits when mandate scope matches verified Abraxas permit", () => {
    const result = evaluateTransactionMandate({
      mandate: BASE_MANDATE,
      transaction: TX,
      now: new Date("2026-06-01T12:00:00.000Z"),
      abraxas_receipt_verified: true,
      abraxas_outcome: "permit",
    });
    expect(result.outcome).toBe("permit");
  });

  it("denies expired and revoked mandates", () => {
    const expired = evaluateTransactionMandate({
      mandate: BASE_MANDATE,
      transaction: TX,
      now: new Date("2028-01-02T00:00:00.000Z"),
      abraxas_receipt_verified: true,
      abraxas_outcome: "permit",
    });
    expect(expired.outcome).toBe("deny");
    expect(expired.reasons).toContain("mandate_expired");

    const revoked = evaluateTransactionMandate({
      mandate: { ...BASE_MANDATE, revoked_at_iso: "2026-05-01T00:00:00.000Z" },
      transaction: TX,
      now: new Date("2026-06-01T12:00:00.000Z"),
      abraxas_receipt_verified: true,
      abraxas_outcome: "permit",
    });
    expect(revoked.outcome).toBe("deny");
  });

  it("denies wrong actor, amount, or destination", () => {
    const wrongActor = evaluateTransactionMandate({
      mandate: BASE_MANDATE,
      transaction: { ...TX, actor_wallet: "OtherWallet22222222222222222222222222222222" },
      now: new Date("2026-06-01T12:00:00.000Z"),
      abraxas_receipt_verified: true,
      abraxas_outcome: "permit",
    });
    expect(wrongActor.outcome).toBe("deny");

    const overAmount = evaluateTransactionMandate({
      mandate: BASE_MANDATE,
      transaction: { ...TX, amount_usd: 250_001 },
      now: new Date("2026-06-01T12:00:00.000Z"),
      abraxas_receipt_verified: true,
      abraxas_outcome: "permit",
    });
    expect(overAmount.reasons).toContain("amount_exceeds_mandate");
  });

  it("never treats wallet control receipt as mandate satisfaction", () => {
    expect(walletControlReceiptSatisfiesMandate()).toBe(false);
  });

  it("fail-closed on indeterminate Abraxas outcome", () => {
    const result = evaluateTransactionMandate({
      mandate: BASE_MANDATE,
      transaction: TX,
      now: new Date("2026-06-01T12:00:00.000Z"),
      abraxas_receipt_verified: true,
      abraxas_outcome: "indeterminate",
    });
    expect(result.outcome).toBe("indeterminate");
  });
});
