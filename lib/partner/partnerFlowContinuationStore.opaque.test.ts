// FILE: lib/partner/partnerFlowContinuationStore.opaque.test.ts
// Regression: hosted handoff vr_* tokens must not hit verify_request_id uuid column.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContinuationStoreUnavailableError } from "./partnerFlowContinuation";

const OPAQUE = "vr_81cfe12715d8c338";
const UUID = "00000000-0000-4000-8000-0000000000aa";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

describe("createSupabaseContinuationStore opaque verify_request routing", () => {
  beforeEach(() => {
    mockFrom.mockReset();
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

  it("peeks opaque tokens via opaque_verify_request column", async () => {
    const chain = {
      upsert: vi.fn(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          jti: "jti-opaque",
          partner_id: "ref-wc-postrev-5ffe",
          policy_id: "ref-wc-postrev-5ffe-wallet_control-v1",
          return_url: "https://example.com/callback",
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 900_000).toISOString(),
          consumed_at: null,
          verify_request_id: null,
          opaque_verify_request: OPAQUE,
        },
        error: null,
      }),
      is: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    };
    mockFrom.mockReturnValue(chain);

    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    const row = await store.peekByVerifyRequestId(OPAQUE);

    expect(chain.eq).toHaveBeenCalledWith("opaque_verify_request", OPAQUE);
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

  it("maps postgres uuid rejection to continuation_store_unavailable", async () => {
    const chain = {
      upsert: vi.fn(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "22P02",
          message: `invalid input syntax for type uuid: "${OPAQUE}"`,
        },
      }),
      is: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    };
    mockFrom.mockReturnValue(chain);

    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    await expect(store.peekByVerifyRequestId(OPAQUE)).rejects.toBeInstanceOf(ContinuationStoreUnavailableError);
  });
});
