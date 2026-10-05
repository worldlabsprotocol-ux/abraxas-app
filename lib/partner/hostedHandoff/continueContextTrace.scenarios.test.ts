import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { PartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import { createContinueContextTraceCollector } from "./continueContextTrace";
import {
  createHostedHandoff,
  putHandoffForTests,
  resetHostedHandoffsForTests,
} from "./store";
import { resolveHostedHandoffForContinue } from "./resolveForContinue";

const OPAQUE = "vr_81cfe12715d8c338";

const app: LaunchpadApplicationRow = {
  id: "11111111-1111-1111-1111-111111111111",
  public_slug: "acme-retail",
  partner_id: "acme",
  application_name: "Acme retail",
  display_name: "Acme",
  environment: "sandbox",
  policy_id: "acme-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["http://localhost:3000/callback"],
  api_key_id: "key-1",
  production_api_key_id: null,
  production_key_revealed_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-09-20T00:00:00.000Z",
  updated_at: "2026-09-20T00:00:00.000Z",
};

const stored: PartnerFlowStoredConfig = {
  purpose: "Confirm adult retail eligibility",
  action: "retail_access",
  callback_url: "http://localhost:3000/callback",
  capabilities: [],
  display_label: "Acme",
};

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: vi.fn(async () => app),
}));

function newTrace() {
  return createContinueContextTraceCollector();
}

beforeEach(() => {
  resetHostedHandoffsForTests();
  mockRpc.mockReset();
  mockFrom.mockReset();
  const chain = {
    upsert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    is: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };
  mockFrom.mockReturnValue(chain);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("continueContextTrace scenarios (#563)", () => {
  it("A. R1 no existing row traces peek through save_enter", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const trace = newTrace();
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({ ...created, verify_request: OPAQUE });

    const resolved = await resolveHostedHandoffForContinue(OPAQUE, { trace });
    expect(resolved.ok).toBe(true);

    const checkpoints = trace.checkpoints();
    expect(checkpoints).toEqual(expect.arrayContaining([
      "resolver_enter",
      "ensure_enter",
      "store_created",
      "peek_enter",
      "identifier_normalized",
      "opaque_branch",
      "admin_client_acquired",
      "opaque_rpc_helper_enter",
      "before_rpc",
      "after_rpc",
      "peek_return_null",
      "save_enter",
      "resolver_return",
    ]));
    expect(checkpoints).not.toContain("reuse_return");
  });

  it("B. R2 existing row traces row reuse without save_enter", async () => {
    const rowPayload = {
      jti: "jti-existing",
      partner_id: "acme",
      policy_id: app.policy_id,
      return_url: "http://localhost:3000/callback",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 900_000).toISOString(),
      consumed_at: null,
      verify_request_id: null,
      opaque_verify_request: OPAQUE,
    };
    mockRpc.mockResolvedValue({ data: [rowPayload], error: null });

    const trace = newTrace();
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({ ...created, verify_request: OPAQUE });

    const resolved = await resolveHostedHandoffForContinue(OPAQUE, { trace });
    expect(resolved.ok).toBe(true);

    const checkpoints = trace.checkpoints();
    expect(checkpoints).toEqual(expect.arrayContaining([
      "peek_enter",
      "opaque_branch",
      "before_rpc",
      "after_rpc",
      "row_candidate",
      "map_success",
      "peek_return_found",
      "reuse_return",
      "resolver_return",
    ]));
    expect(checkpoints).not.toContain("save_enter");
  });

  it("C. RPC error traces before_rpc, rpc_error, ensure_throw", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "function not found" },
    });

    const trace = newTrace();
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({ ...created, verify_request: OPAQUE });

    const resolved = await resolveHostedHandoffForContinue(OPAQUE, { trace });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.code).toBe("unavailable");

    const checkpoints = trace.checkpoints();
    expect(checkpoints).toEqual(expect.arrayContaining([
      "before_rpc",
      "rpc_error",
      "ensure_throw",
    ]));
    expect(checkpoints).not.toContain("save_enter");
  });

  it("D. normalization failure traces normalization_failed without RPC", async () => {
    const { createSupabaseContinuationStore } = await import("@/lib/partner/partnerFlowContinuationStore");
    const trace = createContinueContextTraceCollector();
    const store = createSupabaseContinuationStore({ trace });

    const result = await store.peekByVerifyRequestId("   ");
    expect(result).toBeNull();

    const checkpoints = trace.checkpoints();
    expect(checkpoints).toEqual([
      "peek_enter",
      "normalization_failed",
      "peek_return_null",
    ]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("E. conflict recovery traces save_conflict and recovery RPC checkpoints", async () => {
    const rowPayload = {
      jti: "jti-winner",
      partner_id: "acme",
      policy_id: app.policy_id,
      return_url: "http://localhost:3000/callback",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 900_000).toISOString(),
      consumed_at: null,
      verify_request_id: null,
      opaque_verify_request: OPAQUE,
    };

    mockRpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [rowPayload], error: null });

    const chain = mockFrom();
    chain.upsert.mockResolvedValueOnce({
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });

    const trace = newTrace();
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({ ...created, verify_request: OPAQUE });

    const resolved = await resolveHostedHandoffForContinue(OPAQUE, { trace });
    expect(resolved.ok).toBe(true);

    const checkpoints = trace.checkpoints();
    expect(checkpoints).toEqual(expect.arrayContaining([
      "save_enter",
      "save_conflict",
      "recovery_peek_enter",
      "recovery_before_rpc",
      "recovery_after_rpc",
      "row_candidate",
      "map_success",
      "peek_return_found",
      "reuse_return",
    ]));
  });
});
