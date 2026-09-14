// FILE: lib/credentials/ensureZkLoginWalletBinding.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const SUBJECT = "0x" + "a".repeat(64);

const mockRequireSupabaseAdmin = vi.fn();
const mockAppendAuditEvent = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => mockRequireSupabaseAdmin(),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: (...args: unknown[]) => mockAppendAuditEvent(...args),
}));

import {
  ensureZkLoginWalletBinding,
  getCanonicalWalletBindingSnapshot,
} from "./ensureZkLoginWalletBinding";

function makeSupabase(state: {
  binding?: Record<string, unknown> | null;
  claim?: Record<string, unknown> | null;
  rpcResult?: Record<string, unknown>;
  rpcError?: { message: string } | null;
}) {
  const from = vi.fn((table: string) => {
    if (table === "wallet_bindings") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: state.binding ?? null, error: null }),
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
                maybeSingle: async () => ({ data: state.claim ?? null, error: null }),
              }),
            }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return {
    from,
    rpc: vi.fn(async () => ({
      data: state.rpcResult ?? { ok: true, claim_id: "claim-1" },
      error: state.rpcError ?? null,
    })),
  };
}

describe("ensureZkLoginWalletBinding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendAuditEvent.mockResolvedValue("audit-1");
  });

  it("returns ok when canonical binding and claim already exist", async () => {
    mockRequireSupabaseAdmin.mockReturnValue(makeSupabase({
      binding: { binding_method: "zklogin", binding_status: "active", revoked_at: null },
      claim: { id: "claim-1" },
    }));

    const result = await ensureZkLoginWalletBinding(SUBJECT);
    expect(result.status).toBe("ok");
  });

  it("repairs missing binding through atomic RPC", async () => {
    let binding = null as Record<string, unknown> | null;
    let claim = null as Record<string, unknown> | null;
    const sb = makeSupabase({ binding, claim });
    sb.from = vi.fn((table: string) => {
      if (table === "wallet_bindings") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: binding,
                    error: null,
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
                  maybeSingle: async () => ({ data: claim, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
    sb.rpc = vi.fn(async () => {
      binding = { binding_method: "zklogin", binding_status: "active", revoked_at: null };
      claim = { id: "claim-1" };
      return { data: { ok: true, claim_id: "claim-1" }, error: null };
    });
    mockRequireSupabaseAdmin.mockReturnValue(sb);

    const result = await ensureZkLoginWalletBinding(SUBJECT);
    expect(result.status).toBe("repaired");
    expect(sb.rpc).toHaveBeenCalledWith("upsert_zklogin_wallet_binding_atomic", {
      p_subject_id: SUBJECT,
      p_wallet_address: SUBJECT,
      p_binding_method: "zklogin",
    });
  });

  it("emits wallet.binding_failed audit when RPC rejects", async () => {
    mockRequireSupabaseAdmin.mockReturnValue(makeSupabase({
      binding: null,
      claim: null,
      rpcResult: { ok: false, code: "database_error" },
    }));

    await expect(ensureZkLoginWalletBinding(SUBJECT)).rejects.toThrow(/RPC rejected/);
    expect(mockAppendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "wallet.binding_failed" }),
    );
  });
});

describe("getCanonicalWalletBindingSnapshot", () => {
  it("reports missing when binding or claim is absent", async () => {
    mockRequireSupabaseAdmin.mockReturnValue(makeSupabase({
      binding: null,
      claim: null,
    }));

    const snapshot = await getCanonicalWalletBindingSnapshot(SUBJECT);
    expect(snapshot.persisted).toBe(false);
    expect(snapshot.binding_status).toBe("missing");
    expect(snapshot.repairable).toBe(true);
  });
});
