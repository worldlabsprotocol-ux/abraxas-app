// FILE: lib/partner/partnerFlowSolanaHolder.integration.test.ts
// Automated coverage for Solana-native partner holder auth + policy routing (no live browser).

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const requireHolderRequestContext = vi.fn();

vi.mock("@/lib/holder/holderRequestContext", () => ({
  requireHolderRequestContext: (...args: unknown[]) => requireHolderRequestContext(...args),
  holderClaimsSubjectKey: (ctx: { claimsSubjectKey: string }) => ctx.claimsSubjectKey,
}));

describe("requirePartnerFlowHolder", () => {
  beforeEach(() => {
    requireHolderRequestContext.mockReset();
  });

  it("rejects solana session without wallet binding", async () => {
    requireHolderRequestContext.mockResolvedValue({
      ok: true,
      ctx: {
        mode: "solana_native",
        claimsSubjectKey: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        holderAccountId: "sub_ind_x",
        solanaAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        walletBindingActive: false,
        walletBindingFresh: false,
      },
    });

    const { requirePartnerFlowHolder } = await import("@/lib/partner/partnerFlowHolderContext");
    const result = await requirePartnerFlowHolder({} as NextRequest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.code).toBe("wallet_binding_required");
    }
  });
});
