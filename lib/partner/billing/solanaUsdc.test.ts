// FILE: lib/partner/billing/solanaUsdc.test.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import { Keypair, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  SolanaBillingConfigurationError,
  createSolanaBillingPayment,
  paidPlanAmountMinor,
  readSolanaBillingConfig,
  transactionPaysBillingIntent,
} from "./solanaUsdc";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Solana USDC plan billing", () => {
  it("prices monthly plans in six-decimal USDC minor units", () => {
    expect(paidPlanAmountMinor("launch")).toBe(99_000_000);
    expect(paidPlanAmountMinor("scale")).toBe(499_000_000);
  });

  it("fails closed until every chain binding is explicitly configured", () => {
    vi.stubEnv("ABRAXAS_SOLANA_BILLING_CLUSTER", "");
    vi.stubEnv("ABRAXAS_SOLANA_BILLING_RPC_URL", "");
    expect(() => readSolanaBillingConfig()).toThrow(SolanaBillingConfigurationError);
  });

  it("creates a standard Solana Pay transfer request without partner data", () => {
    const recipient = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const reference = Keypair.generate().publicKey;
    const payment = createSolanaBillingPayment({
      planId: "launch",
      intentId: "4b166788-09fe-42b7-a96e-560d8d3f3cfd",
      reference,
      config: {
        cluster: "devnet",
        networkId: "solana_devnet",
        rpcUrl: "https://api.devnet.solana.com",
        recipient,
        tokenMint: mint,
      },
    });
    const url = new URL(payment.paymentUrl);
    expect(url.protocol).toBe("solana:");
    expect(url.pathname).toBe(recipient.toBase58());
    expect(url.searchParams.get("amount")).toBe("99.00");
    expect(url.searchParams.get("spl-token")).toBe(mint.toBase58());
    expect(url.searchParams.get("reference")).toBe(reference.toBase58());
    expect(payment.paymentUrl).not.toContain("partner_id");
  });

  it("accepts only a finalized successful transfer that increases the recipient ATA", () => {
    const recipient = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const reference = Keypair.generate().publicKey;
    const recipientAta = getAssociatedTokenAddressSync(mint, recipient);
    const transaction = {
      blockTime: 2_000,
      meta: {
        err: null,
        preTokenBalances: [{
          accountIndex: 1,
          mint: mint.toBase58(),
          uiTokenAmount: { amount: "1000000", decimals: 6, uiAmount: 1, uiAmountString: "1" },
        }],
        postTokenBalances: [{
          accountIndex: 1,
          mint: mint.toBase58(),
          uiTokenAmount: { amount: "100000000", decimals: 6, uiAmount: 100, uiAmountString: "100" },
        }],
      },
      transaction: {
        message: {
          accountKeys: [
            { pubkey: reference, signer: false, writable: false },
            { pubkey: recipientAta, signer: false, writable: true },
          ],
        },
      },
    } as unknown as ParsedTransactionWithMeta;

    expect(transactionPaysBillingIntent({
      transaction,
      reference,
      recipient,
      tokenMint: mint,
      amountMinor: 99_000_000,
      createdAtMs: 1_999_000,
    })).toBe(true);

    transaction.meta!.err = { InstructionError: [0, "Custom"] };
    expect(transactionPaysBillingIntent({
      transaction,
      reference,
      recipient,
      tokenMint: mint,
      amountMinor: 99_000_000,
      createdAtMs: 1_999_000,
    })).toBe(false);
  });
});
