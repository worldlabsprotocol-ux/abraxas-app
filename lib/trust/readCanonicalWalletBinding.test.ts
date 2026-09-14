// FILE: lib/trust/readCanonicalWalletBinding.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WALLET_BINDING_READ_FAILED_CODE } from "./getTrustStatus";

const SUBJECT = "0x" + "b".repeat(64);

const createClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

import { readCanonicalWalletBindingTruth } from "./readCanonicalWalletBinding";

describe("readCanonicalWalletBindingTruth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("returns active persisted binding when binding and claim are present", async () => {
    createClient.mockReturnValue({
      from: (table: string) => {
        if (table === "wallet_bindings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { binding_status: "active", revoked_at: null },
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "credential_claims") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: { id: "claim-1" } }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    });

    const truth = await readCanonicalWalletBindingTruth(SUBJECT);
    expect(truth).toEqual({
      persisted: true,
      status: "active",
    });
  });

  it("returns unavailable on read errors without leaking database details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    createClient.mockReturnValue({
      from: (table: string) => {
        if (table === "wallet_bindings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: null,
                      error: { message: "relation wallet_bindings does not exist" },
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "credential_claims") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    });

    const truth = await readCanonicalWalletBindingTruth(SUBJECT);
    expect(truth.status).toBe("unavailable");
    expect(truth.persisted).toBe(false);
    expect(truth.read_error).toBe(WALLET_BINDING_READ_FAILED_CODE);
    expect(JSON.stringify(truth)).not.toContain("wallet_bindings");
    consoleError.mockRestore();
  });
});
