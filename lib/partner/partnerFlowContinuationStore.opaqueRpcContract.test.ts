// FILE: lib/partner/partnerFlowContinuationStore.opaqueRpcContract.test.ts
// PostgREST-faithful contract tests for migration-131 SETOF RPC boundary (#562).

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ContinuationStoreUnavailableError,
  ContinuationUniqueConflictError,
} from "./partnerFlowContinuation";
import {
  OPAQUE_CONTINUATION_PEEK_RPC,
  OPAQUE_CONTINUATION_PEEK_RPC_ARG,
} from "./hostedHandoff/continuationOpaqueRpcDiagnostics";

const OPAQUE = "vr_4e795fbe99303008";
const JTI = "22da5f72-23a8-482c-9e36-0052d60c975f";
const EXPIRES = "2026-10-05 14:10:40.072+00";

type StoredRow = Record<string, unknown>;

function productionRow(overrides: Partial<StoredRow> = {}): StoredRow {
  return {
    jti: JTI,
    partner_id: "ref-wc-postrev-5ffe",
    policy_id: "ref-wc-postrev-5ffe-wallet_control-v1",
    policy_version: 1,
    return_url: "https://example.com/callback",
    purpose: "Confirm you control an eligible wallet",
    app_slug: "ref-wc-postrev-proof",
    created_at: "2026-10-05 13:55:55.989+00",
    expires_at: EXPIRES,
    consumed_at: null,
    verify_request_id: null,
    opaque_verify_request: OPAQUE,
    ...overrides,
  };
}

function createPostgrestSetofRpcDouble(initial: StoredRow[] = []) {
  const rows = [...initial];

  const rpc = vi.fn(async (_name: string, args: Record<string, string>) => {
    const opaque = args[OPAQUE_CONTINUATION_PEEK_RPC_ARG]?.trim() ?? "";
    const row = rows.find((candidate) => candidate.opaque_verify_request === opaque) ?? null;
    return { data: row ? [row] : [], error: null };
  });

  const from = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
    is: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  }));

  return {
    rows: () => rows,
    rpc,
    from,
    setRpcResult(result: { data: unknown; error: { code?: string; message?: string } | null }) {
      rpc.mockResolvedValueOnce(result);
    },
  };
}

const mockAdmin = vi.hoisted(() => ({
  double: createPostgrestSetofRpcDouble(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => mockAdmin.double,
}));

describe("opaque RPC contract at application boundary (#562)", () => {
  beforeEach(() => {
    mockAdmin.double = createPostgrestSetofRpcDouble([productionRow()]);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns null when PostgREST SETOF RPC returns zero rows", async () => {
    mockAdmin.double = createPostgrestSetofRpcDouble([]);
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();

    const row = await store.peekByVerifyRequestId(OPAQUE);

    expect(row).toBeNull();
    expect(mockAdmin.double.rpc).toHaveBeenCalledWith(
      OPAQUE_CONTINUATION_PEEK_RPC,
      { [OPAQUE_CONTINUATION_PEEK_RPC_ARG]: OPAQUE },
    );
  });

  it("unwraps one-row SETOF array, maps row, and returns continuation", async () => {
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();

    const row = await store.peekByVerifyRequestId(OPAQUE);

    expect(row).toMatchObject({
      jti: JTI,
      verifyRequestId: OPAQUE,
      consumedAt: null,
    });
    expect(mockAdmin.double.from).not.toHaveBeenCalled();
  });

  it("fail-closes on RPC error instead of treating it as an ordinary peek miss", async () => {
    mockAdmin.double.setRpcResult({
      data: null,
      error: { code: "PGRST202", message: "function not found" },
    });
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();

    await expect(store.peekByVerifyRequestId(OPAQUE)).rejects.toBeInstanceOf(
      ContinuationStoreUnavailableError,
    );
  });

  it("supports resolve #2/#3 reuse: same JTI, one row, unconsumed, no duplicate save", async () => {
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();

    const first = await store.peekByVerifyRequestId(OPAQUE);
    await expect(store.save({
      jti: "new-jti-should-not-persist",
      partnerId: "ref-wc-postrev-5ffe",
      policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
      returnUrl: "https://example.com/callback",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      verifyRequestId: OPAQUE,
    })).rejects.toBeInstanceOf(ContinuationUniqueConflictError);
    const second = await store.peekByVerifyRequestId(OPAQUE);

    expect(first?.jti).toBe(JTI);
    expect(second?.jti).toBe(JTI);
    expect(mockAdmin.double.rows()).toHaveLength(1);
    expect(mockAdmin.double.rows()[0]?.consumed_at).toBeNull();
  });

  it("leaves legacy UUID lookup on table maybeSingle path", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    mockAdmin.double.from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(function eq(column: string, value: string) {
        return {
          maybeSingle: vi.fn().mockResolvedValue({
            data: column === "verify_request_id" && value === uuid
              ? productionRow({ verify_request_id: uuid, opaque_verify_request: null })
              : null,
            error: null,
          }),
        };
      }),
    })) as typeof mockAdmin.double.from;

    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    const row = await store.peekByVerifyRequestId(uuid);

    expect(row?.verifyRequestId).toBe(uuid);
    expect(mockAdmin.double.rpc).not.toHaveBeenCalled();
  });
});
