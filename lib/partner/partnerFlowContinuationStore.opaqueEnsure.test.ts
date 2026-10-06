import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ContinuationStoreUnavailableError,
  type PartnerFlowContinuationRecord,
} from "./partnerFlowContinuation";
import { createPostgresSemanticsContinuationStore } from "./partnerFlowContinuationStore.postgresSemantics";
import {
  ENSURE_OPAQUE_CONTINUATION_RPC,
} from "./hostedHandoff/continuationOpaqueEnsureDiagnostics";

const OPAQUE = "vr_807615b865693158";
const EXISTING_JTI = "f6fc0400-d431-4e0a-ab06-2cfc4264933d";

function continuationRecord(overrides: Partial<PartnerFlowContinuationRecord> = {}): PartnerFlowContinuationRecord {
  return {
    jti: globalThis.crypto.randomUUID(),
    partnerId: "ref-wc-postrev-5ffe",
    policyId: "ref-wc-postrev-5ffe-wallet_control-v1",
    policyVersion: 1,
    returnUrl: "https://example.com/callback",
    purpose: "Confirm you control an eligible wallet",
    appSlug: "ref-wc-postrev-proof",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
    consumedAt: null,
    verifyRequestId: OPAQUE,
    ...overrides,
  };
}

function productionEnsureRow(
  record: PartnerFlowContinuationRecord,
  wasCreated: boolean,
): Record<string, unknown> {
  return {
    was_created: wasCreated,
    jti: record.jti,
    partner_id: record.partnerId,
    policy_id: record.policyId,
    policy_version: record.policyVersion,
    return_url: record.returnUrl,
    permission: record.permission ?? null,
    permission_version: record.permissionVersion ?? null,
    purpose: record.purpose ?? null,
    app_slug: record.appSlug ?? null,
    verify_request_id: null,
    consumed_at: record.consumedAt ?? null,
    expires_at: record.expiresAt,
    created_at: record.createdAt,
    opaque_verify_request: OPAQUE,
  };
}

function createEnsureRpcDouble(initial: Record<string, unknown>[] = []) {
  const rows = [...initial];
  const rpc = vi.fn(async (_name: string, args: Record<string, unknown>) => {
    const opaque = String(args.p_opaque ?? "").trim();
    const existing = rows.find((row) => row.opaque_verify_request === opaque);
    if (existing) {
      return { data: [{ ...existing, was_created: false }], error: null };
    }
    const inserted = {
      was_created: true,
      jti: args.p_jti,
      partner_id: args.p_partner_id,
      policy_id: args.p_policy_id,
      policy_version: args.p_policy_version,
      return_url: args.p_return_url,
      permission: args.p_permission,
      permission_version: args.p_permission_version,
      purpose: args.p_purpose,
      app_slug: args.p_app_slug,
      verify_request_id: null,
      consumed_at: null,
      expires_at: args.p_expires_at,
      created_at: args.p_created_at,
      opaque_verify_request: opaque,
    };
    rows.push(inserted);
    return { data: [inserted], error: null };
  });
  return { rows: () => rows, rpc };
}

const mockAdmin = vi.hoisted(() => ({
  double: createEnsureRpcDouble(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => mockAdmin.double,
}));

describe("opaque ensure atomic RPC (#565)", () => {
  beforeEach(() => {
    mockAdmin.double = createEnsureRpcDouble();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("creates on first resolve and returns wasCreated true", async () => {
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    const record = continuationRecord();

    const first = await store.ensureByOpaqueVerifyRequest(record, { verifyRequestRef: OPAQUE });

    expect(first.wasCreated).toBe(true);
    expect(first.record.jti).toBe(record.jti);
    expect(mockAdmin.double.rows()).toHaveLength(1);
    expect(mockAdmin.double.rpc).toHaveBeenCalledWith(
      ENSURE_OPAQUE_CONTINUATION_RPC,
      expect.objectContaining({ p_opaque: OPAQUE, p_jti: record.jti }),
    );
  });

  it("reuses same continuation on second and third resolve", async () => {
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    const firstRecord = continuationRecord({ jti: EXISTING_JTI });

    const first = await store.ensureByOpaqueVerifyRequest(firstRecord, { verifyRequestRef: OPAQUE });
    const second = await store.ensureByOpaqueVerifyRequest(
      continuationRecord({ jti: "should-not-win" }),
      { verifyRequestRef: OPAQUE },
    );
    const third = await store.ensureByOpaqueVerifyRequest(
      continuationRecord({ jti: "also-should-not-win" }),
      { verifyRequestRef: OPAQUE },
    );

    expect(first.wasCreated).toBe(true);
    expect(second.wasCreated).toBe(false);
    expect(third.wasCreated).toBe(false);
    expect(first.record.jti).toBe(EXISTING_JTI);
    expect(second.record.jti).toBe(EXISTING_JTI);
    expect(third.record.jti).toBe(EXISTING_JTI);
    expect(mockAdmin.double.rows()).toHaveLength(1);
  });

  it("concurrent callers receive the same canonical continuation", async () => {
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();
    const results = await Promise.all([
      store.ensureByOpaqueVerifyRequest(continuationRecord({ jti: "race-a" }), { verifyRequestRef: OPAQUE }),
      store.ensureByOpaqueVerifyRequest(continuationRecord({ jti: "race-b" }), { verifyRequestRef: OPAQUE }),
    ]);

    expect(results[0]?.record.jti).toBe(results[1]?.record.jti);
    expect(mockAdmin.double.rows()).toHaveLength(1);
  });

  it("fail-closes on RPC error", async () => {
    mockAdmin.double.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST202", message: "function not found" },
    });
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();

    await expect(
      store.ensureByOpaqueVerifyRequest(continuationRecord(), { verifyRequestRef: OPAQUE }),
    ).rejects.toBeInstanceOf(ContinuationStoreUnavailableError);
  });

  // In-memory semantics: single-threaded JS, not PostgreSQL READ COMMITTED MVCC.
  // Real concurrency parity requires MIGRATION_132_PG_URL (see sqlParity test).
  it("postgres semantics store keeps one row under concurrent ensure", async () => {
    const store = createPostgresSemanticsContinuationStore();
    const results = await Promise.all([
      store.ensureByOpaqueVerifyRequest(continuationRecord({ jti: "race-a" })),
      store.ensureByOpaqueVerifyRequest(continuationRecord({ jti: "race-b" })),
    ]);

    expect(results[0]?.record.jti).toBe(results[1]?.record.jti);
    expect(store.rowCount()).toBe(1);
  });

  it("returns existing row when pre-seeded without duplicate insert", async () => {
    const existing = continuationRecord({ jti: EXISTING_JTI });
    mockAdmin.double = createEnsureRpcDouble([productionEnsureRow(existing, false)]);
    const { createSupabaseContinuationStore } = await import("./partnerFlowContinuationStore");
    const store = createSupabaseContinuationStore();

    const result = await store.ensureByOpaqueVerifyRequest(
      continuationRecord({ jti: "new-jti" }),
      { verifyRequestRef: OPAQUE },
    );

    expect(result.wasCreated).toBe(false);
    expect(result.record.jti).toBe(EXISTING_JTI);
    expect(mockAdmin.double.rows()).toHaveLength(1);
  });
});
