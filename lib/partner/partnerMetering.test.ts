import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildPartnerApiMeteringKey,
  buildPartnerFlowReceiptMeteringKey,
  partnerMeteringPayloadHasNoPii,
  recordPartnerFlowReceiptMetering,
  resolvePartnerApiMeteringCorrelationId,
} from "@/lib/partner/partnerMetering";
import { maybeRecordPartnerFlowReceiptMetering, maybeRecordPartnerApiMeteringFromUsage } from "@/lib/partner/partnerMeteringHooks";
import {
  evaluatePartnerEntitlements,
  defaultPartnerEntitlements,
  upsertPartnerEntitlements,
} from "@/lib/partner/partnerEntitlements";
import {
  partnerMeteringReportHasNoPii,
  validatePartnerMeteringDateRange,
} from "@/lib/partner/partnerMeteringReport";
import { resolveAdminActorCategory } from "@/lib/admin/adminActorCategory";

const insertMock = vi.fn();
const upsertMock = vi.fn().mockReturnThis();
const fromMock = vi.fn(() => ({
  insert: insertMock,
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  upsert: upsertMock,
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: fromMock })),
}));

function receiptMeteringKey(receiptId: string): string {
  return buildPartnerFlowReceiptMeteringKey(receiptId);
}

function simulatePartnerFlowMetering(input: {
  operation: "evaluate" | "complete" | "refresh";
  partnerId: string;
  replayStatus: "issued" | "idempotent_replay";
  decision: string;
  receiptId: string;
  policyId?: string;
  decisionId?: string;
}): void {
  maybeRecordPartnerFlowReceiptMetering({
    partnerId: input.partnerId,
    replayStatus: input.replayStatus,
    decision: input.decision,
    receiptId: input.receiptId,
    policyId: input.policyId,
    decisionId: input.decisionId,
  });
}

describe("partner metering ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    insertMock.mockResolvedValue({ error: null });
  });

  it("records fresh approved receipt issuance once", async () => {
    const result = await recordPartnerFlowReceiptMetering({
      partnerId: "acme-protocol",
      receiptId: "dr_test_001",
      policyId: "acme-gate-v1",
      decisionId: "dec-1",
    });

    expect(result.recorded).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      partner_id: "acme-protocol",
      event_type: "partner_flow_receipt_issued",
      idempotency_key: receiptMeteringKey("dr_test_001"),
      receipt_id: "dr_test_001",
      policy_id: "acme-gate-v1",
      decision_id: "dec-1",
    }));
  });

  it("counts replay as zero additional billable events", async () => {
    insertMock
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: "23505", message: "duplicate" } });

    const first = await recordPartnerFlowReceiptMetering({
      partnerId: "acme-protocol",
      receiptId: "dr_test_001",
    });
    const replay = await recordPartnerFlowReceiptMetering({
      partnerId: "acme-protocol",
      receiptId: "dr_test_001",
    });

    expect(first.recorded).toBe(true);
    expect(replay.recorded).toBe(false);
    expect(replay.duplicate).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(insertMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      idempotency_key: receiptMeteringKey("dr_test_001"),
    }));
    expect(insertMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      idempotency_key: receiptMeteringKey("dr_test_001"),
    }));
  });

  it("evaluate: fresh approved issuance uses meter:pf_receipt:{receipt_id}", () => {
    simulatePartnerFlowMetering({
      operation: "evaluate",
      partnerId: "acme-protocol",
      replayStatus: "issued",
      decision: "approved",
      receiptId: "dr_eval_001",
      policyId: "acme-gate-v1",
      decisionId: "dec-eval",
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      event_type: "partner_flow_receipt_issued",
      idempotency_key: receiptMeteringKey("dr_eval_001"),
      receipt_id: "dr_eval_001",
    }));
  });

  it("evaluate: idempotent replay adds zero events", () => {
    simulatePartnerFlowMetering({
      operation: "evaluate",
      partnerId: "acme-protocol",
      replayStatus: "idempotent_replay",
      decision: "approved",
      receiptId: "dr_eval_001",
    });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("complete: fresh approved issuance uses meter:pf_receipt:{receipt_id}", () => {
    simulatePartnerFlowMetering({
      operation: "complete",
      partnerId: "acme-protocol",
      replayStatus: "issued",
      decision: "approved",
      receiptId: "dr_complete_001",
      policyId: "acme-gate-v1",
      decisionId: "dec-complete",
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      idempotency_key: receiptMeteringKey("dr_complete_001"),
      receipt_id: "dr_complete_001",
    }));
  });

  it("complete: replay of same receipt adds zero events", () => {
    simulatePartnerFlowMetering({
      operation: "complete",
      partnerId: "acme-protocol",
      replayStatus: "idempotent_replay",
      decision: "approved",
      receiptId: "dr_complete_001",
    });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("refresh: new receipt from refresh adds exactly one event with receipt-scoped key", async () => {
    simulatePartnerFlowMetering({
      operation: "refresh",
      partnerId: "acme-protocol",
      replayStatus: "issued",
      decision: "approved",
      receiptId: "dr_refresh_v2",
      policyId: "acme-gate-v1",
      decisionId: "dec-refresh",
    });

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      idempotency_key: receiptMeteringKey("dr_refresh_v2"),
      receipt_id: "dr_refresh_v2",
    }));

    insertMock.mockResolvedValueOnce({ error: { code: "23505", message: "duplicate" } });
    const replay = await recordPartnerFlowReceiptMetering({
      partnerId: "acme-protocol",
      receiptId: "dr_refresh_v2",
    });
    expect(replay.duplicate).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it("refresh: replaced receipt id gets its own meter:pf_receipt key", () => {
    simulatePartnerFlowMetering({
      operation: "refresh",
      partnerId: "acme-protocol",
      replayStatus: "issued",
      decision: "approved",
      receiptId: "dr_refresh_v1",
    });
    simulatePartnerFlowMetering({
      operation: "refresh",
      partnerId: "acme-protocol",
      replayStatus: "issued",
      decision: "approved",
      receiptId: "dr_refresh_v2",
    });

    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(insertMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      idempotency_key: receiptMeteringKey("dr_refresh_v1"),
    }));
    expect(insertMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      idempotency_key: receiptMeteringKey("dr_refresh_v2"),
    }));
  });

  it("does not record idempotent replay from partner flow hook", () => {
    maybeRecordPartnerFlowReceiptMetering({
      partnerId: "acme-protocol",
      replayStatus: "idempotent_replay",
      decision: "approved",
      receiptId: "dr_test_001",
    });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("does not record denied issuance from partner flow hook", () => {
    maybeRecordPartnerFlowReceiptMetering({
      partnerId: "acme-protocol",
      replayStatus: "issued",
      decision: "denied",
      receiptId: "dr_test_001",
    });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("records newly issued approved receipt from partner flow hook", () => {
    maybeRecordPartnerFlowReceiptMetering({
      partnerId: "acme-protocol",
      replayStatus: "issued",
      decision: "approved",
      receiptId: "dr_test_002",
      policyId: "acme-gate-v1",
      decisionId: "dec-2",
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      event_type: "partner_flow_receipt_issued",
      receipt_id: "dr_test_002",
      idempotency_key: receiptMeteringKey("dr_test_002"),
    }));
  });

  it("isolates partner api metering keys by partner_id", () => {
    const keyA = buildPartnerApiMeteringKey({
      partnerId: "partner-a",
      method: "POST",
      endpoint: "/api/v1/verification-requests",
      correlationId: "vr-1",
    });
    const keyB = buildPartnerApiMeteringKey({
      partnerId: "partner-b",
      method: "POST",
      endpoint: "/api/v1/verification-requests",
      correlationId: "vr-1",
    });

    expect(keyA).not.toEqual(keyB);
    expect(keyA).toContain("partner-a");
    expect(keyB).toContain("partner-b");
  });

  it("excludes public receipt views from api metering hook", () => {
    maybeRecordPartnerApiMeteringFromUsage({
      endpoint: "/api/receipts/public",
      method: "GET",
      success: true,
      partner: {
        partnerId: "acme-protocol",
        apiKeyId: "key-1",
        displayName: "Test",
        keyPrefix: "abx_live_",
        scopes: ["verify:requests"],
      },
    });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("records authenticated api call metering with correlation id", () => {
    maybeRecordPartnerApiMeteringFromUsage({
      endpoint: "/api/v1/verification-requests",
      method: "POST",
      success: true,
      recordId: "vr-123",
      partner: {
        partnerId: "acme-protocol",
        apiKeyId: "key-1",
        displayName: "Test",
        keyPrefix: "abx_live_",
        scopes: ["verify:requests"],
      },
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      partner_id: "acme-protocol",
      event_type: "partner_api_call",
      endpoint: "/api/v1/verification-requests",
      method: "POST",
      api_key_id: "key-1",
    }));
  });

  it("rejects payloads containing pii-like values", () => {
    expect(partnerMeteringPayloadHasNoPii({
      partner_id: "acme-protocol",
      receipt_id: "dr_test",
      decision_id: "dec-1",
      wallet_address: "0xabc",
    })).toBe(false);
  });

  it("has no pii in safe metering payloads", () => {
    const payload = {
      partner_id: "acme-protocol",
      event_type: "partner_flow_receipt_issued",
      idempotency_key: buildPartnerFlowReceiptMeteringKey("dr_test"),
      receipt_id: "dr_test",
      policy_id: "acme-gate-v1",
      decision_id: "dec-1",
    };
    expect(partnerMeteringPayloadHasNoPii(payload)).toBe(true);
    expect(JSON.stringify(payload)).not.toContain("@");
    expect(JSON.stringify(payload)).not.toContain("0x");
  });

  it("resolves api correlation id from record id before path", () => {
    expect(resolvePartnerApiMeteringCorrelationId({
      recordId: "vr-abc",
      endpoint: "/api/v1/receipts/dr_other/public",
      method: "GET",
    })).toBe("vr-abc");
  });
});

describe("partner entitlements observe-only default", () => {
  it("defaults to observe-only and never blocks", async () => {
    const defaults = defaultPartnerEntitlements("acme-protocol");
    expect(defaults.enforcementMode).toBe("observe");
    expect(defaults.planId).toBe("observe");

    const evaluation = await evaluatePartnerEntitlements({
      partnerId: "acme-protocol",
      currentReceiptCount: 9999,
      currentApiCallCount: 9999,
    });

    expect(evaluation.observeOnly).toBe(true);
    expect(evaluation.wouldBlock).toBe(false);
    expect(evaluation.enforcementEnabled).toBe(false);
    expect(evaluation.enforcementMode).toBe("observe");
  });

  it("stores non-pii actor category in updated_by", async () => {
    const actorCategory = resolveAdminActorCategory("email");
    upsertMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          partner_id: "acme-protocol",
          plan_id: "observe",
          monthly_receipt_limit: 100,
          monthly_api_call_limit: null,
          enforcement_mode: "observe",
          updated_at: "2026-01-01T00:00:00.000Z",
          updated_by: actorCategory,
        },
        error: null,
      }),
    });

    const updated = await upsertPartnerEntitlements({
      partnerId: "acme-protocol",
      monthlyReceiptLimit: 100,
      updatedBy: actorCategory,
    });

    expect(updated?.updatedBy).toBe("admin_authorized_email");
    expect(JSON.stringify(updated)).not.toContain("@");
    expect(JSON.stringify(updated)).not.toContain("admin_email:");
  });
});

describe("partner metering privacy", () => {
  it("admin actor categories never contain email or local-part", () => {
    const sampleEmail = "operator@example.com";
    const localPart = sampleEmail.split("@")[0];
    const category = resolveAdminActorCategory("email");

    expect(category).not.toContain("@");
    expect(category).not.toContain(localPart);
    expect(category).not.toBe(`admin_email:${localPart}`);
  });

  it("metering ledger keys never embed verification-request or session idempotency", () => {
    const receiptId = "dr_test_001";
    const key = buildPartnerFlowReceiptMeteringKey(receiptId);

    expect(key).toBe(`meter:pf_receipt:${receiptId}`);
    expect(key).not.toContain("pf_vr:");
    expect(key).not.toContain("pf_session:");
  });
});

describe("partner metering report validation", () => {
  it("rejects invalid date ranges", () => {
    expect(validatePartnerMeteringDateRange({ from: "not-a-date", to: "2026-01-01" }).ok).toBe(false);
  });

  it("report shape excludes pii patterns", () => {
    const report = {
      partner_id: "acme-protocol",
      range: { from: "2026-01-01T00:00:00.000Z", to: "2026-01-31T00:00:00.000Z" },
      observe_only: true,
      enforcement_mode: "observe",
      plan_id: "observe",
      daily: [{ date: "2026-01-15", partner_flow_receipt_issued: 1, partner_api_call: 2, total: 3 }],
      monthly: [{ month: "2026-01", partner_flow_receipt_issued: 1, partner_api_call: 2, total: 3 }],
      totals: { partner_flow_receipt_issued: 1, partner_api_call: 2, total: 3 },
      pagination: { limit: 31, offset: 0, returned_days: 1 },
    };
    expect(partnerMeteringReportHasNoPii(report)).toBe(true);
    expect(JSON.stringify(report)).not.toContain("@");
  });
});
