// FILE: lib/trust/getTrustStatus.walletBinding.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const SUBJECT = "0x" + "c".repeat(64);

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
});

vi.mock("@/lib/credentials/claimsService", () => ({
  getActiveClaims: vi.fn(async () => []),
}));

vi.mock("@/lib/sui/passportIssuer", () => ({
  isPassportIssuerConfigured: () => false,
  getSponsorConfig: () => ({ sponsor_address: null }),
}));

const createClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

import { getTrustStatus, WALLET_BINDING_READ_FAILED_CODE } from "./getTrustStatus";

function intentChallengesTable() {
  return {
    select: (cols?: string) => {
      if (cols === "id") {
        return {
          eq: () => ({
            eq: async () => ({ count: 0 }),
          }),
        };
      }
      return {
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          }),
        }),
      };
    },
  };
}

describe("getTrustStatus wallet binding truth", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    vi.clearAllMocks();
  });

  it("reports unavailable when wallet binding queries fail", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const sensitiveMessage = "relation public.wallet_bindings does not exist (SQLSTATE 42P01)";

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
                      error: { message: sensitiveMessage },
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
        if (table === "identity_verifications") {
          return { select: () => ({ or: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
        }
        if (table === "abraxas_credentials") {
          return {
            select: () => ({
              or: () => ({
                is: () => ({
                  order: () => ({
                    limit: () => ({ maybeSingle: async () => ({ data: null }) }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "sui_passport_objects") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
        }
        if (table === "intent_challenges") return intentChallengesTable();
        throw new Error(`unexpected table ${table}`);
      },
    });

    const status = await getTrustStatus(SUBJECT);
    expect(status?.wallet_binding_status).toBe("unavailable");
    expect(status?.wallet_binding_persisted).toBe(false);
    expect(status?.wallet_registered).toBe(false);
    expect(status?.wallet_binding_read_error).toBe(WALLET_BINDING_READ_FAILED_CODE);
    expect(JSON.stringify(status)).not.toContain("wallet_bindings");
    expect(JSON.stringify(status)).not.toContain("42P01");
    expect(JSON.stringify(status)).not.toContain("relation public");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does not mark wallet registered from address alone", async () => {
    createClient.mockReturnValue({
      from: (table: string) => {
        if (table === "wallet_bindings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null }),
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
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "identity_verifications") {
          return { select: () => ({ or: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
        }
        if (table === "abraxas_credentials") {
          return {
            select: () => ({
              or: () => ({
                is: () => ({
                  order: () => ({
                    limit: () => ({ maybeSingle: async () => ({ data: null }) }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "sui_passport_objects") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
        }
        if (table === "intent_challenges") return intentChallengesTable();
        throw new Error(`unexpected table ${table}`);
      },
    });

    const status = await getTrustStatus(SUBJECT);
    expect(status?.wallet_registered).toBe(false);
    expect(status?.wallet_binding_persisted).toBe(false);
    expect(status?.wallet_binding_status).toBe("missing");
  });

  it("marks wallet registered only when binding and claim are active", async () => {
    createClient.mockReturnValue({
      from: (table: string) => {
        if (table === "wallet_bindings") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        binding_method: "zklogin",
                        binding_status: "active",
                        revoked_at: null,
                      },
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
        if (table === "identity_verifications") {
          return { select: () => ({ or: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
        }
        if (table === "abraxas_credentials") {
          return {
            select: () => ({
              or: () => ({
                is: () => ({
                  order: () => ({
                    limit: () => ({ maybeSingle: async () => ({ data: null }) }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "sui_passport_objects") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
        }
        if (table === "intent_challenges") return intentChallengesTable();
        throw new Error(`unexpected table ${table}`);
      },
    });

    const status = await getTrustStatus(SUBJECT);
    expect(status?.wallet_registered).toBe(true);
    expect(status?.wallet_binding_persisted).toBe(true);
    expect(status?.wallet_binding_status).toBe("active");
  });
});
