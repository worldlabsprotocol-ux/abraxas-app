import { describe, expect, it, vi, beforeEach } from "vitest";
import { CIRCLE_PUBLIC_CODES } from "@/lib/settlement/circle/codes";
import { sealCircleAuthenticatedResult } from "@/lib/settlement/circle/authenticated.server";
import { CIRCLE_CURRENCY, CIRCLE_NETWORK } from "@/lib/settlement/circle/constants";
import type { SettlementIntentRow } from "@/lib/settlement/circle/store";

const probeMock = vi.fn();
const gateMock = vi.fn();
const insertMock = vi.fn();
const applyEvidenceMock = vi.fn();
const listMock = vi.fn();
const createPortMock = vi.fn(() => null);

vi.mock("@/lib/settlement/circle/availability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settlement/circle/availability")>(
    "@/lib/settlement/circle/availability",
  );
  return {
    ...actual,
    probeCircleAvailability: (...args: unknown[]) => probeMock(...args),
  };
});

vi.mock("@/lib/settlement/circle/receiptGate", () => ({
  gateSettlementReceipt: (...args: unknown[]) => gateMock(...args),
}));

vi.mock("@/lib/settlement/circle/store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settlement/circle/store")>(
    "@/lib/settlement/circle/store",
  );
  return {
    ...actual,
    insertPendingIntent: (...args: unknown[]) => insertMock(...args),
    applyAuthenticatedEvidence: (...args: unknown[]) => applyEvidenceMock(...args),
    listIntentsForApplication: (...args: unknown[]) => listMock(...args),
  };
});

vi.mock("@/lib/partner/launchpad/recordActivity", () => ({
  recordLaunchpadActivity: vi.fn(async () => undefined),
}));

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: vi.fn(() => ({})),
  getSupabaseAdmin: vi.fn(() => null),
}));

vi.mock("@/lib/settlement/circle/client.server", () => ({
  createCircleWalletsPortFromEnv: () => createPortMock(),
}));

import { runCircleSettlement } from "@/lib/settlement/circle/execute";

const app = {
  id: "app-1",
  public_slug: "acme",
  partner_id: "acme",
  application_name: "Acme",
  display_name: "Acme",
  environment: "sandbox" as const,
  policy_id: "policy-1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: [],
  api_key_id: null,
  production_api_key_id: null,
  production_key_revealed_at: null,
  status: "active" as const,
  idempotency_key: null,
  created_at: "2026-09-18T00:00:00.000Z",
  updated_at: "2026-09-18T00:00:00.000Z",
};

function pendingRow(): SettlementIntentRow {
  return {
    id: "intent-1",
    application_id: "app-1",
    partner_id: "acme",
    idempotency_key: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    state: "pending",
    network: CIRCLE_NETWORK,
    currency: CIRCLE_CURRENCY,
    amount_minor: 10_000,
    receipt_id: "receipt-1",
    policy_id: "policy-1",
    policy_version: 1,
    provider_request_ref: null,
    circle_transaction_id: null,
    provider_state: null,
    provider_occurred_at: null,
    infrastructure_label: "DEMO/testnet settlement wallet — test infrastructure only",
    created_at: "2026-09-18T00:00:00.000Z",
    updated_at: "2026-09-18T00:00:00.000Z",
  };
}

function unavailableAvailability() {
  return {
    available: false,
    schema_ready: true,
    configured: false,
    credentials_status: "unavailable" as const,
    code: CIRCLE_PUBLIC_CODES.unavailable,
    feature: "circle_arc_testnet_settlement" as const,
    activates_production: false as const,
  };
}

function readyAvailability() {
  return {
    available: true,
    schema_ready: true,
    configured: true,
    credentials_status: "configured" as const,
    code: null,
    feature: "circle_arc_testnet_settlement" as const,
    activates_production: false as const,
  };
}

describe("runCircleSettlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPortMock.mockReturnValue(null);
    gateMock.mockResolvedValue({ ok: true, code: CIRCLE_PUBLIC_CODES.pending, receipt_id: "receipt-1" });
    listMock.mockResolvedValue([]);
  });

  it("creates a pending intent when Circle is unavailable and does not mark it settled", async () => {
    probeMock.mockResolvedValue(unavailableAvailability());
    insertMock.mockResolvedValue({ ok: true, row: pendingRow(), duplicate: false });
    const result = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      receiptId: "receipt-1",
      body: { receipt_id: "receipt-1", idempotency_key: "demo-arc-settlement-1" },
    });
    expect(result.ok).toBe(true);
    expect(result.code).toBe("circle_unavailable");
    expect(result.evidence?.state).toBe("pending");
    expect(result.activates_production).toBe(false);
    expect(result.intent_is_not_a_payment).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: "app-1",
      receiptId: "receipt-1",
    }));
    expect(insertMock.mock.calls[0][0].idempotencyKey).toBeUndefined();
  });

  it("does not create an intent when the receipt gate fails closed", async () => {
    probeMock.mockResolvedValue(readyAvailability());
    gateMock.mockResolvedValue({
      ok: false,
      code: CIRCLE_PUBLIC_CODES.receipt_denied,
      receipt_id: "receipt-denied",
    });
    const result = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      receiptId: "receipt-denied",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("settlement_receipt_denied");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("settles from a sealed Circle COMPLETE result and blocks a duplicate", async () => {
    probeMock.mockResolvedValue(readyAvailability());
    const row = pendingRow();
    insertMock.mockResolvedValueOnce({ ok: true, row, duplicate: false });
    const sealed = sealCircleAuthenticatedResult({
      providerRequestRef: row.idempotency_key,
      circleTransactionId: "tx-1",
      network: CIRCLE_NETWORK,
      currency: CIRCLE_CURRENCY,
      amountMinor: 10_000,
      providerState: "COMPLETE",
      occurredAt: "2026-09-18T00:00:00.000Z",
    });
    createPortMock.mockReturnValue({
      authenticateAgainstArcTestnet: async () => ({ ok: true, network: CIRCLE_NETWORK }),
      createTestnetUsdcTransfer: async (input: { idempotencyKey: string }) => {
        expect(input.idempotencyKey).toBe(row.idempotency_key);
        expect(input.idempotencyKey).not.toBe("demo-arc-settlement-1");
        return { ok: true, result: sealed };
      },
      getTransaction: async () => ({ ok: true, result: sealed }),
    });
    applyEvidenceMock.mockResolvedValue({
      ...row,
      state: "settled",
      provider_request_ref: row.idempotency_key,
      circle_transaction_id: "tx-1",
      provider_state: "COMPLETE",
    });
    const first = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      receiptId: "receipt-1",
    });
    expect(first.evidence?.state).toBe("settled");
    expect(first.evidence?.circle_transaction_id).toBe("tx-1");
    expect(gateMock).toHaveBeenCalledTimes(2);

    insertMock.mockResolvedValueOnce({
      ok: true,
      row: { ...row, state: "settled", circle_transaction_id: "tx-1" },
      duplicate: true,
    });
    const second = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      receiptId: "receipt-1",
      body: { receipt_id: "receipt-1", idempotency_key: "demo-arc-settlement-1" },
    });
    expect(second.duplicate).toBe(true);
    expect(second.code).toBe("settlement_duplicate");
  });

  it("allocates distinct Circle keys when two applications share identical browser input", async () => {
    probeMock.mockResolvedValue(unavailableAvailability());
    const browserBody = { receipt_id: "shared-receipt", idempotency_key: "demo-arc-settlement-1" };
    insertMock
      .mockResolvedValueOnce({
        ok: true,
        row: { ...pendingRow(), application_id: "app-a", idempotency_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        duplicate: false,
      })
      .mockResolvedValueOnce({
        ok: true,
        row: { ...pendingRow(), application_id: "app-b", idempotency_key: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
        duplicate: false,
      });
    const first = await runCircleSettlement({
      application: { ...app, id: "app-a" },
      partnerId: "acme",
      receiptId: browserBody.receipt_id,
      body: browserBody,
    });
    const second = await runCircleSettlement({
      application: { ...app, id: "app-b" },
      partnerId: "acme",
      receiptId: browserBody.receipt_id,
      body: browserBody,
    });
    expect(first.evidence?.idempotency_key).not.toBe(second.evidence?.idempotency_key);
    expect(first.evidence?.idempotency_key).not.toBe(browserBody.idempotency_key);
    expect(second.evidence?.idempotency_key).not.toBe(browserBody.idempotency_key);
    expect(insertMock.mock.calls[0][0].idempotencyKey).toBeUndefined();
    expect(insertMock.mock.calls[1][0].idempotencyKey).toBeUndefined();
  });
});
