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

  it("dedupes duplicate partner share rows for display", () => {
    const state = buildPassportCanonicalState({
      identityUi: "not_started",
      shares: [
        {
          id: "a",
          partner_id: "cielo",
          purpose: "guest",
          claims_authorized: ["wallet_binding_confirmed"],
          shared_at: "2026-06-01T00:00:00Z",
          expires_at: null,
          revoked_at: null,
        },
        {
          id: "b",
          partner_id: "cielo",
          purpose: "guest",
          claims_authorized: ["wallet_binding_confirmed"],
          shared_at: "2026-07-01T00:00:00Z",
          expires_at: null,
          revoked_at: null,
        },
      ],
    });
    expect(state.access.shares).toHaveLength(1);
    expect(state.access.activeCount).toBe(1);
  });
});
