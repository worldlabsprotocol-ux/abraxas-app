// FILE: lib/walletAuthority/walletAuthority.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { createEvmChallengePayload } from "@/lib/walletAuthority/evmSiwe";

const TEST_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TEST_SUBJECT = "0x0000000000000000000000000000000000000000000000000000000000000002";
const account = privateKeyToAccount(TEST_KEY);

type ChallengeRow = Record<string, unknown>;

function makeChallengeRow(): ChallengeRow {
  const payload = createEvmChallengePayload({
    domain: "abraxas-app.vercel.app",
    address: account.address,
    chainId: 1,
  });
  return {
    id: payload.challengeId,
    wallet_address: account.address,
    chain: "evm",
    chain_id: 1,
    message: payload.message,
    domain: payload.domain,
    subject_id: TEST_SUBJECT,
    expires_at: payload.expiresAt,
    consumed_at: null,
  };
}

function createMockSupabase(initialChallenge: ChallengeRow) {
  const state = {
    challenge: { ...initialChallenge },
    bindings: [] as Record<string, unknown>[],
  };

  const challengesTable = {
    select: () => ({
      eq: (_col: string, id: string) => ({
        maybeSingle: async () => ({
          data: state.challenge.id === id ? state.challenge : null,
        }),
      }),
    }),
    update: (patch: Record<string, unknown>) => ({
      eq: (_col: string, id: string) => ({
        is: (_c: string, _v: null) => ({
          select: () => ({
            maybeSingle: async () => {
              if (state.challenge.id !== id || state.challenge.consumed_at) {
                return { data: null };
              }
              state.challenge = { ...state.challenge, ...patch };
              return { data: state.challenge };
            },
          }),
        }),
      }),
    }),
    insert: async () => ({ error: null }),
  };

  const bindingsTable = {
    select: () => ({
      eq: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      }),
    }),
    upsert: (row: Record<string, unknown>) => ({
      select: () => ({
        single: async () => {
          state.bindings.push(row);
          return {
            data: { id: "binding-1", ...row },
            error: null,
          };
        },
      }),
    }),
  };

  return {
    state,
    from: (table: string) => {
      if (table === "wallet_binding_challenges") return challengesTable;
      if (table === "wallet_bindings") return bindingsTable;
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => mockSb,
}));

vi.mock("@/lib/credentials/claimsService", () => ({
  upsertClaims: vi.fn(async () => undefined),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn(async () => undefined),
}));

let mockSb: ReturnType<typeof createMockSupabase>;

describe("consumeWalletBindingChallenge", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows exactly one concurrent consume", async () => {
    const challenge = makeChallengeRow();
    mockSb = createMockSupabase(challenge);

    const { consumeWalletBindingChallenge } = await import("@/lib/walletAuthority/service");

    const [first, second] = await Promise.all([
      consumeWalletBindingChallenge(mockSb as never, challenge.id as string),
      consumeWalletBindingChallenge(mockSb as never, challenge.id as string),
    ]);

    const successes = [first, second].filter(Boolean);
    expect(successes).toHaveLength(1);
  });
});

describe("confirmEvmBinding concurrent bind", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows exactly one concurrent bind against the same challenge", async () => {
    const challenge = makeChallengeRow();
    mockSb = createMockSupabase(challenge);
    const signature = await account.signMessage({ message: challenge.message as string });

    const { confirmEvmBinding } = await import("@/lib/walletAuthority/service");

    const results = await Promise.allSettled([
      confirmEvmBinding({
        subjectId: TEST_SUBJECT,
        challengeId: challenge.id as string,
        signature,
      }),
      confirmEvmBinding({
        subjectId: TEST_SUBJECT,
        challengeId: challenge.id as string,
        signature,
      }),
    ]);

    const fulfilled = results.filter(r => r.status === "fulfilled");
    const rejected = results.filter(r => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const reason = (rejected[0] as PromiseRejectedResult).reason;
    expect(String(reason)).toMatch(/already used/i);
  });
});
