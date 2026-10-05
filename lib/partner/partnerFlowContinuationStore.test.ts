// FILE: lib/partner/partnerFlowContinuationStore.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContinuationStoreUnavailableError } from "./partnerFlowContinuation";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

describe("createSupabaseContinuationStore", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("treats a missing 091 table as continuation_store_unavailable on create, peek, and consume", async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: { message: "Could not find the table" } }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST205" } }),
      update: vi.fn().mockReturnThis(),
    };
    mockFrom.mockReturnValue(chain);

    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    const record = {
      jti: "jti-1",
      partnerId: "p",
      policyId: "pol",
      returnUrl: "https://example.com/callback",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000).toISOString(),
    };

    await expect(store.save(record)).rejects.toBeInstanceOf(ContinuationStoreUnavailableError);
    await expect(store.peek("jti-1")).rejects.toBeInstanceOf(ContinuationStoreUnavailableError);
    await expect(store.consume("jti-1")).rejects.toBeInstanceOf(ContinuationStoreUnavailableError);
    await expect(store.peekByVerifyRequestId("vr-1")).rejects.toBeInstanceOf(ContinuationStoreUnavailableError);
  });

  it("canonicalizes Postgres timestamptz expires_at on peek", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          jti: "jti-1",
          partner_id: "p",
          policy_id: "pol",
          return_url: "https://example.com/callback",
          created_at: "2026-10-05 10:09:52.199+00",
          expires_at: "2026-10-05 10:53:01.053+00",
          consumed_at: null,
          opaque_verify_request: "vr_live0000000001",
        },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    const row = await store.peekByVerifyRequestId("vr_live0000000001");

    expect(row?.expiresAt).toBe("2026-10-05T10:53:01.053Z");
  });
});
