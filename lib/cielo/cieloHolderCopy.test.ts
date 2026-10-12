import { describe, expect, it } from "vitest";
import { cieloHolderCopyForSession, CIELO_HOLDER_COPY } from "@/lib/cielo/cieloHolderCopy";

describe("cieloHolderCopyForSession", () => {
  it("returns legacy copy when not solana-native", () => {
    const copy = cieloHolderCopyForSession(false);
    expect(copy.signInWalletLead).toBe(CIELO_HOLDER_COPY.signInWalletLead);
    expect(copy.signInWalletLead).toMatch(/Sui/i);
  });

  it("uses phantom-first copy without Sui onboarding language when solana-native", () => {
    const copy = cieloHolderCopyForSession(true);
    expect(copy.signInWalletLead).not.toMatch(/Sui/i);
    expect(copy.signInWalletLead).toMatch(/Phantom/i);
    expect(copy.walletSessionNoPassport).not.toMatch(/Sui/i);
  });
});
