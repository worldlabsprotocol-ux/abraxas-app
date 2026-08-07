import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildPartnerApiMeteringKey,
  buildPartnerFlowReceiptMeteringKey,
  partnerMeteringPayloadHasNoPii,
  recordPartnerMeteringEvent,
  recordPartnerFlowReceiptMetering,
  resolvePartnerApiMeteringCorrelationId,
} from "@/lib/partner/partnerMetering";
import { maybeRecordPartnerFlowReceiptMetering, maybeRecordPartnerApiMeteringFromUsage } from "@/lib/partner/partnerMeteringHooks";
import { evaluatePartnerEntitlements, defaultPartnerEntitlements } from "@/lib/partner/partnerEntitlements";
import {
  partnerMeteringReportHasNoPii,
  validatePartnerMeteringDateRange,
} from "@/lib/partner/partnerMeteringReport";

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({
  insert: insertMock,
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  upsert: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: fromMock })),
}));

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
      idempotency_key: buildPartnerFlowReceiptMeteringKey("dr_test_001"),
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
  });
});
