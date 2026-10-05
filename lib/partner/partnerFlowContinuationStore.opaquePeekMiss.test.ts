// FILE: lib/partner/partnerFlowContinuationStore.opaquePeekMiss.test.ts
// Reproduces #560 production peek miss: row persisted with opaque vr_* but table filter returned null.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContinuationUniqueConflictError } from "./partnerFlowContinuation";

const PRODUCTION_OPAQUE = "vr_903c4a1df1fe0893";
const PRODUCTION_JTI = "66e63ad0-b4a1-4416-8e5c-f9b1bbe4ba8f";
const PRODUCTION_EXPIRES = "2026-10-05 12:40:40.072+00";

type StoredRow = Record<string, unknown>;

function productionRow(overrides: Partial<StoredRow> = {}): StoredRow {
  return {
    jti: PRODUCTION_JTI,
    partner_id: "ref-wc-postrev-5ffe",
    policy_id: "ref-wc-postrev-5ffe-wallet_control-v1",
    policy_version: 1,
    return_url: "https://example.com/callback",
    purpose: "Confirm you control an eligible wallet",
    app_slug: "ref-wc-postrev-proof",
    created_at: "2026-10-05 12:25:55.989+00",
    expires_at: PRODUCTION_EXPIRES,
    consumed_at: null,
    verify_request_id: null,
    opaque_verify_request: PRODUCTION_OPAQUE,
    ...overrides,
  };
}

function createPostgrestOpaqueTablePeekMissDouble(initial: StoredRow[] = []) {
  const rows = [...initial];

  const rpc = vi.fn(async (_name: string, args: { p_opaque?: string }) => {
    const opaque = args.p_opaque?.trim() ?? "";
    const row = rows.find((candidate) => candidate.opaque_verify_request === opaque) ?? null;
    return { data: row ? [row] : [], error: null };
  });

  const from = vi.fn(() => {
    const chain = {
      upsert: vi.fn(async (payload: StoredRow) => {
        const opaque = typeof payload.opaque_verify_request === "string"
          ? payload.opaque_verify_request.trim()
          : null;
        if (opaque && rows.some((row) => row.opaque_verify_request === opaque && row.jti !== payload.jti)) {
          return {
            error: {
              code: "23505",
              message: 'duplicate key value violates unique constraint "idx_partner_flow_continuations_opaque_verify_request"',
            },
          };
        }
        rows.push(payload);
        return { error: null };
      }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(function eq(column: string, value: string) {
        if (column === "opaque_verify_request") {
          return {
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        if (column === "verify_request_id") {
          return {
            maybeSingle: vi.fn().mockResolvedValue({
              data: rows.find((row) => row.verify_request_id === value) ?? null,
              error: null,
            }),
          };
        }
        return chain;
      }),
      maybeSingle: vi.fn(),
      is: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    };
    return chain;
  });

  return {
    rows: () => rows,
    rpc,
    from,
  };
}

const mockAdmin = vi.hoisted(() => ({
  double: createPostgrestOpaqueTablePeekMissDouble(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => mockAdmin.double,
}));

describe("createSupabaseContinuationStore opaque peek miss (#560 production shape)", () => {
  beforeEach(() => {
    mockAdmin.double = createPostgrestOpaqueTablePeekMissDouble([
      productionRow(),
    ]);
  });

  it("reproduces production table-filter miss and resolves via SQL RPC peek", async () => {
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();

    const row = await store.peekByVerifyRequestId(PRODUCTION_OPAQUE);

    expect(row).not.toBeNull();
    expect(row?.jti).toBe(PRODUCTION_JTI);
    expect(row?.verifyRequestId).toBe(PRODUCTION_OPAQUE);
    expect(row?.consumedAt).toBeNull();
    expect(mockAdmin.double.rpc).toHaveBeenCalledWith(
      "partner_flow_continuation_peek_by_opaque",
      { p_opaque: PRODUCTION_OPAQUE },
    );
    expect(mockAdmin.double.from).not.toHaveBeenCalled();
  });

  it("maps verify_request_id=null + opaque_verify_request=vr_* through the mapper", async () => {
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    const row = await store.peekByVerifyRequestId(PRODUCTION_OPAQUE);

    expect(row?.verifyRequestId).toBe(PRODUCTION_OPAQUE);
    expect(row?.expiresAt).toBe("2026-10-05T12:40:40.072Z");
  });

  it("normalizes whitespace on opaque peek to match trimmed persistence", async () => {
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    const row = await store.peekByVerifyRequestId(` ${PRODUCTION_OPAQUE} `);

    expect(row?.verifyRequestId).toBe(PRODUCTION_OPAQUE);
    expect(mockAdmin.double.rpc).toHaveBeenCalledWith(
      "partner_flow_continuation_peek_by_opaque",
      { p_opaque: PRODUCTION_OPAQUE },
    );
  });

  it("recovers opaque unique conflicts using the same RPC lookup path", async () => {
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();

    await expect(store.save({
      jti: "new-jti-should-not-persist",
      partnerId: "ref-wc-postrev-5ffe",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      returnUrl: "https://example.com/callback",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      verifyRequestId: PRODUCTION_OPAQUE,
    })).rejects.toBeInstanceOf(ContinuationUniqueConflictError);

    const recovered = await store.peekByVerifyRequestId(PRODUCTION_OPAQUE);
    expect(recovered?.jti).toBe(PRODUCTION_JTI);
    expect(mockAdmin.double.rows()).toHaveLength(1);
  });
});
