// FILE: lib/partner/partnerFlowContinuationStore.opaque.test.ts
// Regression: hosted handoff vr_* tokens must not hit verify_request_id uuid column.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContinuationStoreUnavailableError, ContinuationUniqueConflictError } from "./partnerFlowContinuation";

const OPAQUE = "vr_81cfe12715d8c338";
const UUID = "00000000-0000-4000-8000-0000000000aa";

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

describe("createSupabaseContinuationStore opaque verify_request routing", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it("would fail #555 production when vr_* is written to verify_request_id uuid column", async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({
        error: {
          code: "22P02",
          message: `invalid input syntax for type uuid: "${OPAQUE}"`,
        },
      }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      is: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    };
    mockFrom.mockReturnValue(chain);

    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    const record = {
      jti: "jti-opaque",
      partnerId: "ref-wc-postrev-5ffe",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      returnUrl: "https://example.com/callback",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      verifyRequestId: OPAQUE,
    };

    chain.upsert.mockResolvedValueOnce({ error: null });
    await store.save(record);

    expect(chain.upsert).toHaveBeenCalledWith(expect.objectContaining({
      verify_request_id: null,
      opaque_verify_request: OPAQUE,
    }));
    expect(chain.upsert).not.toHaveBeenCalledWith(expect.objectContaining({
      verify_request_id: OPAQUE,
    }));
  });

  it("peeks opaque tokens via partner_flow_continuation_peek_by_opaque RPC", async () => {
    const rowPayload = {
      jti: "jti-opaque",
      partner_id: "ref-wc-postrev-5ffe",
      policy_id: "ref-wc-postrev-5ffe-wallet_control-v1",
      return_url: "https://example.com/callback",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 900_000).toISOString(),
      consumed_at: null,
      verify_request_id: null,
      opaque_verify_request: OPAQUE,
    };
    mockRpc.mockResolvedValue({ data: [rowPayload], error: null });

    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    const row = await store.peekByVerifyRequestId(OPAQUE);

    expect(mockRpc).toHaveBeenCalledWith("partner_flow_continuation_peek_by_opaque", { p_opaque: OPAQUE });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(row?.verifyRequestId).toBe(OPAQUE);
  });

  it("peeks verification_requests UUID via verify_request_id column", async () => {
    const chain = {
      upsert: vi.fn(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          jti: "jti-uuid",
          partner_id: "partner",
          policy_id: "policy",
          return_url: "https://example.com/callback",
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 900_000).toISOString(),
          consumed_at: null,
          verify_request_id: UUID,
          opaque_verify_request: null,
        },
        error: null,
      }),
      is: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    };
    mockFrom.mockReturnValue(chain);

    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    await store.peekByVerifyRequestId(UUID);

    expect(chain.eq).toHaveBeenCalledWith("verify_request_id", UUID);
  });

  it("surfaces opaque unique conflicts as ContinuationUniqueConflictError", async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({
        error: {
          code: "23505",
          message: 'duplicate key value violates unique constraint "idx_partner_flow_continuations_opaque_verify_request"',
        },
      }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      is: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    };
    mockFrom.mockReturnValue(chain);

    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    await expect(store.save({
      jti: "jti-new",
      partnerId: "ref-wc-postrev-5ffe",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      returnUrl: "https://example.com/callback",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      verifyRequestId: OPAQUE,
    })).rejects.toBeInstanceOf(ContinuationUniqueConflictError);
  });

  it("maps opaque RPC failures to continuation_store_unavailable", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "function not found" },
    });

    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    await expect(store.peekByVerifyRequestId(OPAQUE)).rejects.toBeInstanceOf(ContinuationStoreUnavailableError);
  });

  it("maps legacy UUID lookup postgres rejection to continuation_store_unavailable", async () => {
    const chain = {
      upsert: vi.fn(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "22P02",
          message: `invalid input syntax for type uuid: "${UUID}"`,
        },
      }),
      is: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    };
    mockFrom.mockReturnValue(chain);

    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    await expect(store.peekByVerifyRequestId(UUID)).rejects.toBeInstanceOf(ContinuationStoreUnavailableError);
  });
});
