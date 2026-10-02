// FILE: lib/operations/concurrencyHarness.test.ts
// Deterministic protocol-level concurrency checks (local/test only).

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  recallSandboxRun,
  rememberSandboxRun,
  resetSandboxIdempotencyStoreForTests,
} from "@/lib/partner/launchpad/sandboxReadiness/idempotency";
import { buildNarrowPartnerResultForReceipt } from "@/lib/partner/narrowPartnerResult/build";

const getReceiptById = vi.fn();
vi.mock("@/lib/decisionReceipts/service", () => ({
  getReceiptById: (...args: unknown[]) => getReceiptById(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: (table: string) => ({
      upsert: async () => ({ error: null }),
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: table === "sandbox_readiness_runs" ? {
                    application_id: "app_1",
                    partner_id: "partner-a",
                    stage: "policy_configured",
                    idempotency_key: "run_1",
                    status: "pass",
                    code: "policy_configured",
                    detail: "ok",
                    recorded_at: new Date().toISOString(),
                  } : null,
                }),
              }),
            }),
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            in: () => ({
              select: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/decisionReceipts/views", () => ({
  verifyRecordSignature: () => true,
}));

describe("concurrency harness", () => {
  beforeEach(() => {
    resetSandboxIdempotencyStoreForTests();
    getReceiptById.mockReset();
  });

  it("handles parallel narrow-result reads without mutation", async () => {
    getReceiptById.mockResolvedValue({
      id: "dr_parallel",
      verification_decision_id: "dec_p",
      partner_id: "partner-a",
      policy_id: "partner-a-age_21_retail-v1",
      policy_version: 1,
      decision_result: "denied",
      schema_version: "1.0.0",
      payload_hash: "abc",
      signature: "sig",
      signing_key_id: "key",
    });

    const results = await Promise.all(
      Array.from({ length: 50 }, () => buildNarrowPartnerResultForReceipt("dr_parallel")),
    );
    expect(results.every((row) => row?.decision === "denied")).toBe(true);
    expect(new Set(results.map((row) => JSON.stringify(row))).size).toBe(1);
  });

  it("returns duplicate sandbox readiness runs for concurrent idempotent keys", async () => {
    const input = {
      applicationId: "app_1",
      partnerId: "partner-a",
      stage: "policy_configured",
      idempotencyKey: "run_1",
      status: "pass",
      code: "policy_configured",
      detail: "first",
      at: new Date().toISOString(),
    };
    await rememberSandboxRun(input);
    const parallel = await Promise.all(
      Array.from({ length: 10 }, () => recallSandboxRun({
        partnerId: input.partnerId,
        applicationId: input.applicationId,
        stage: input.stage,
        idempotencyKey: input.idempotencyKey,
      })),
    );
    expect(parallel.every((row) => row?.code === "policy_configured")).toBe(true);
  });

  it("sandbox idempotency memory cache serves concurrent recalls consistently", async () => {
    await rememberSandboxRun({
      applicationId: "app_mem",
      partnerId: "partner-z",
      stage: "callback_allowlisted",
      idempotencyKey: "idem_mem",
      status: "pass",
      code: "callback_allowlisted",
      detail: "cached",
      at: new Date().toISOString(),
    });
    const parallel = await Promise.all(
      Array.from({ length: 20 }, () => recallSandboxRun({
        partnerId: "partner-z",
        applicationId: "app_mem",
        stage: "callback_allowlisted",
        idempotencyKey: "idem_mem",
      })),
    );
    expect(parallel.every((row) => row?.detail === "cached")).toBe(true);
  });
});
