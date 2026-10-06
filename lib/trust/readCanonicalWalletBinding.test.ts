// FILE: lib/trust/readCanonicalWalletBinding.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WALLET_BINDING_READ_FAILED_CODE } from "./getTrustStatus";
import { walletControlEvidenceRef } from "@/lib/walletControl/contract";

const SUBJECT = "0x" + "b".repeat(64);
const SUI_BINDING_ID = "11111111-1111-4111-8111-111111111111";
const EVM_BINDING_ID = "22222222-2222-4222-8222-222222222222";

const createClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

import { readCanonicalWalletBindingTruth } from "./readCanonicalWalletBinding";

type ClaimRow = {
  id: string;
  claim_value?: Record<string, unknown>;
  evidence_reference?: string | null;
  status?: string;
};

function makeSupabaseMock(input: {
  binding?: {
    id: string;
    binding_status?: string;
    revoked_at?: string | null;
    binding_method?: string;
  } | null;
  bindingError?: { message: string } | null;
  claims?: ClaimRow[];
  claimQueryError?: { message: string } | null;
}) {
  const claims = input.claims ?? [];
  return {
    from: (table: string) => {
      if (table === "wallet_bindings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: input.binding ?? null,
                    error: input.bindingError ?? null,
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === "credential_claims") {
        return {
          select: (columns: string) => ({
            eq: (col: string, val: unknown) => {
              const chain = [{ col, val }];
              const builder = {
                eq(nextCol: string, nextVal: unknown) {
                  chain.push({ col: nextCol, val: nextVal });
                  return builder;
                },
                is(nextCol: string, nextVal: unknown) {
                  chain.push({ col: nextCol, val: nextVal });
                  return builder;
                },
                maybeSingle: async () => {
                  if (input.claimQueryError) {
                    return { data: null, error: input.claimQueryError };
                  }
                  const match = claims.find(row => chain.every(({ col, val }) => {
                    if (col === "subject_id") return val === SUBJECT;
                    if (col === "claim_type") return val === "wallet_binding_confirmed";
                    if (col === "status") return (row.status ?? "active") === val;
                    if (col === "evidence_reference" && val === null) {
                      return row.evidence_reference == null;
                    }
                    if (col === "evidence_reference") {
                      return row.evidence_reference === val;
                    }
                    return (row as Record<string, unknown>)[col] === val;
                  }));
                  if (columns === "id") {
                    return { data: match ? { id: match.id } : null, error: null };
                  }
                  return { data: null, error: null };
                },
                then(onFulfilled: (value: unknown) => unknown) {
                  if (input.claimQueryError) {
                    return Promise.resolve(onFulfilled({ data: null, error: input.claimQueryError }));
                  }
                  let filtered = claims;
                  for (const { col, val } of chain) {
                    if (col === "subject_id") filtered = filtered.filter(r => true);
                    if (col === "claim_type") filtered = filtered.filter(r => r.status !== "revoked");
                    if (col === "status") filtered = filtered.filter(r => (r.status ?? "active") === val);
                    if (col === "evidence_reference" && typeof val === "string") {
                      filtered = filtered.filter(r => r.evidence_reference === val);
                    }
                    if (col === "evidence_reference" && val === null) {
                      filtered = filtered.filter(r => r.evidence_reference == null);
                    }
                  }
                  return Promise.resolve(onFulfilled({ data: filtered, error: null }));
                },
              };
              return builder;
            },
          }),
        };
      }

      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("readCanonicalWalletBindingTruth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("returns missing when holder has zero active wallets", async () => {
    createClient.mockReturnValue(makeSupabaseMock({ binding: null, claims: [] }));

    const truth = await readCanonicalWalletBindingTruth(SUBJECT);
    expect(truth).toEqual({
      persisted: false,
      status: "missing",
      binding_method: null,
      claim_active: false,
      repairable: true,
    });
  });

  it("returns active persisted binding when one scoped Sui claim exists", async () => {
    createClient.mockReturnValue(makeSupabaseMock({
      binding: { id: SUI_BINDING_ID, binding_status: "active", binding_method: "zklogin" },
      claims: [{
        id: "claim-sui",
        evidence_reference: walletControlEvidenceRef(SUI_BINDING_ID),
        status: "active",
      }],
    }));

    const truth = await readCanonicalWalletBindingTruth(SUBJECT);
    expect(truth).toEqual({
      persisted: true,
      status: "active",
      binding_method: "zklogin",
      claim_active: true,
      repairable: false,
    });
  });

  it("remains active when holder also has an active EVM wallet-control claim", async () => {
    createClient.mockReturnValue(makeSupabaseMock({
      binding: { id: SUI_BINDING_ID, binding_status: "active", binding_method: "zklogin" },
      claims: [
        {
          id: "claim-sui",
          evidence_reference: walletControlEvidenceRef(SUI_BINDING_ID),
          status: "active",
        },
        {
          id: "claim-evm",
          evidence_reference: walletControlEvidenceRef(EVM_BINDING_ID),
          status: "active",
          claim_value: {
            chain: "evm",
            wallet_address: "0x1111111111111111111111111111111111111111",
          },
        },
      ],
    }));

    const truth = await readCanonicalWalletBindingTruth(SUBJECT);
    expect(truth.persisted).toBe(true);
    expect(truth.status).toBe("active");
    expect(truth.claim_active).toBe(true);
  });

  it("does not treat revoked Sui claim as active when EVM claim remains active", async () => {
    createClient.mockReturnValue(makeSupabaseMock({
      binding: { id: SUI_BINDING_ID, binding_status: "active", binding_method: "zklogin" },
      claims: [
        {
          id: "claim-evm",
          evidence_reference: walletControlEvidenceRef(EVM_BINDING_ID),
          status: "active",
          claim_value: { chain: "evm", wallet_address: "0x1111111111111111111111111111111111111111" },
        },
      ],
    }));

    const truth = await readCanonicalWalletBindingTruth(SUBJECT);
    expect(truth.persisted).toBe(false);
    expect(truth.status).toBe("active");
    expect(truth.claim_active).toBe(false);
    expect(truth.repairable).toBe(true);
  });

  it("does not treat expired Sui claim as active when EVM claim remains active", async () => {
    createClient.mockReturnValue(makeSupabaseMock({
      binding: { id: SUI_BINDING_ID, binding_status: "active", binding_method: "zklogin" },
      claims: [
        {
          id: "claim-sui-expired",
          evidence_reference: walletControlEvidenceRef(SUI_BINDING_ID),
          status: "expired",
        },
        {
          id: "claim-evm",
          evidence_reference: walletControlEvidenceRef(EVM_BINDING_ID),
          status: "active",
          claim_value: { chain: "evm", wallet_address: "0x1111111111111111111111111111111111111111" },
        },
      ],
    }));

    const truth = await readCanonicalWalletBindingTruth(SUBJECT);
    expect(truth.persisted).toBe(false);
    expect(truth.claim_active).toBe(false);
  });

  it("uses legacy unscoped Sui claim when scoped claim is absent", async () => {
    createClient.mockReturnValue(makeSupabaseMock({
      binding: { id: SUI_BINDING_ID, binding_status: "active", binding_method: "zklogin" },
      claims: [
        {
          id: "claim-legacy-sui",
          evidence_reference: null,
          status: "active",
          claim_value: { chain: "sui", wallet_address: SUBJECT, binding_method: "zklogin" },
        },
        {
          id: "claim-evm",
          evidence_reference: walletControlEvidenceRef(EVM_BINDING_ID),
          status: "active",
          claim_value: { chain: "evm", wallet_address: "0x1111111111111111111111111111111111111111" },
        },
      ],
    }));

    const truth = await readCanonicalWalletBindingTruth(SUBJECT);
    expect(truth.persisted).toBe(true);
    expect(truth.claim_active).toBe(true);
  });

  it("returns unavailable on binding read errors without leaking database details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    createClient.mockReturnValue(makeSupabaseMock({
      binding: null,
      bindingError: { message: "relation wallet_bindings does not exist" },
    }));

    const truth = await readCanonicalWalletBindingTruth(SUBJECT);
    expect(truth.status).toBe("unavailable");
    expect(truth.persisted).toBe(false);
    expect(truth.read_error).toBe(WALLET_BINDING_READ_FAILED_CODE);
    expect(JSON.stringify(truth)).not.toContain("wallet_bindings");
    consoleError.mockRestore();
  });

  it("returns unavailable when scoped claim query fails (legacy multi-row maybeSingle failure)", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    createClient.mockReturnValue(makeSupabaseMock({
      binding: { id: SUI_BINDING_ID, binding_status: "active" },
      claimQueryError: { message: "JSON object requested, multiple (or no) rows returned" },
    }));

    const truth = await readCanonicalWalletBindingTruth(SUBJECT);
    expect(truth.status).toBe("unavailable");
    expect(truth.read_error).toBe(WALLET_BINDING_READ_FAILED_CODE);
    consoleError.mockRestore();
  });

  it("is deterministic regardless of sibling claim ordering in storage", async () => {
    const scenarios = [
      [
        {
          id: "claim-evm-first",
          evidence_reference: walletControlEvidenceRef(EVM_BINDING_ID),
          status: "active",
          claim_value: { chain: "evm", wallet_address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
        },
        {
          id: "claim-sui-second",
          evidence_reference: walletControlEvidenceRef(SUI_BINDING_ID),
          status: "active",
        },
      ],
      [
        {
          id: "claim-sui-first",
          evidence_reference: walletControlEvidenceRef(SUI_BINDING_ID),
          status: "active",
        },
        {
          id: "claim-evm-second",
          evidence_reference: walletControlEvidenceRef(EVM_BINDING_ID),
          status: "active",
          claim_value: { chain: "evm", wallet_address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
        },
      ],
    ] as const;

    for (const claims of scenarios) {
      createClient.mockReturnValue(makeSupabaseMock({
        binding: { id: SUI_BINDING_ID, binding_status: "active", binding_method: "zklogin" },
        claims: [...claims],
      }));
      const truth = await readCanonicalWalletBindingTruth(SUBJECT);
      expect(truth).toMatchObject({
        persisted: true,
        status: "active",
        claim_active: true,
      });
    }
  });
});
