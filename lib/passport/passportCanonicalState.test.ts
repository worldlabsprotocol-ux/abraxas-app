import { describe, expect, it } from "vitest";
import {
  buildPassportCanonicalState,
  formatSharedProof,
  resolveVerificationPlainStatus,
} from "./passportCanonicalState";

describe("passportCanonicalState", () => {
  it("formats shared proof without KYC language", () => {
    expect(formatSharedProof(["wallet_binding_confirmed"], "guest_eligibility")).toBe("Eligibility confirmed");
    expect(formatSharedProof([], null)).toBe("Policy decision only");
  });

  it("aggregates wallet count from bindings", () => {
    const state = buildPassportCanonicalState({
      identityUi: "not_started",
      walletBindings: [
        { id: "1", chain: "sui", wallet_address: "0xabc", binding_status: "active", verified_at: "2026-01-01" },
        { id: "2", chain: "evm", wallet_address: "0xdef", binding_status: "active", verified_at: "2026-01-02" },
      ],
    });
    expect(state.wallets.activeCount).toBe(2);
    expect(state.wallets.summary).toBe("2 wallets connected");
  });

  it("maps identity UI to plain verification status", () => {
    expect(resolveVerificationPlainStatus({ identityUi: "under_review" })).toBe("in_review");
    expect(resolveVerificationPlainStatus({ identityUi: "verified", expiresAt: "2020-01-01" })).toBe("expired");
  });
});
