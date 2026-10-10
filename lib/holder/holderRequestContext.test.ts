// FILE: lib/holder/holderRequestContext.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const requireHolderClaimsSession = vi.fn();
const requireBrowserSession = vi.fn();
const isSolanaNativeProductEnabled = vi.fn();
const requireSupabaseAdmin = vi.fn();

vi.mock("@/lib/auth/holderClaimsSession", () => ({
  requireHolderClaimsSession: (...args: unknown[]) => requireHolderClaimsSession(...args),
}));

vi.mock("@/lib/auth/browserSession", () => ({
  requireBrowserSession: (...args: unknown[]) => requireBrowserSession(...args),
}));

vi.mock("@/lib/auth/solanaNative/featureFlag", () => ({
  isSolanaNativeProductEnabled: (...args: unknown[]) => isSolanaNativeProductEnabled(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: (...args: unknown[]) => requireSupabaseAdmin(...args),
}));

describe("requireHolderRequestContext", () => {
  beforeEach(() => {
    vi.resetModules();
    requireHolderClaimsSession.mockReset();
    requireBrowserSession.mockReset();
    isSolanaNativeProductEnabled.mockReset();
    requireSupabaseAdmin.mockReset();
  });

  it("rejects forged client holder_id paths by requiring session", async () => {
    isSolanaNativeProductEnabled.mockReturnValue(true);
    requireHolderClaimsSession.mockResolvedValue({
      ok: false,
      error: "Sign in with your wallet to continue",
      status: 401,
      code: "holder_session_required",
    });

    const { requireHolderRequestContext } = await import("@/lib/holder/holderRequestContext");
    const req = {} as NextRequest;
    const result = await requireHolderRequestContext(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.code).toBe("holder_session_required");
    }
  });

  it("returns solana native context when wallet binding is active", async () => {
    isSolanaNativeProductEnabled.mockReturnValue(true);
    const claimsKey =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    requireHolderClaimsSession.mockResolvedValue({
      ok: true,
      session: {
        claimsSubjectKey: claimsKey,
        holderAccountId: "sub_ind_test",
        solanaAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        legacySuiAddress: null,
        loginMethod: "solana_wallet",
      },
    });

    requireSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        if (table === "wallet_bindings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    is: () => ({
                      maybeSingle: async () => ({
                        data: {
                          binding_method: "signed_challenge",
                          verified_at: new Date().toISOString(),
                          revoked_at: null,
                          chain: "solana",
                        },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "holder_accounts") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { id: "sub_ind_test" } }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    });

    const { requireHolderRequestContext } = await import("@/lib/holder/holderRequestContext");
    const result = await requireHolderRequestContext({} as NextRequest);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ctx.mode).toBe("solana_native");
      expect(result.ctx.claimsSubjectKey).toBe(claimsKey);
    }
  });
});
