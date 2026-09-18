import { describe, expect, it, vi, beforeEach } from "vitest";
import { CIRCLE_PUBLIC_CODES } from "@/lib/settlement/circle/codes";
import { sealCircleAuthenticatedResult } from "@/lib/settlement/circle/authenticated";
import { CIRCLE_CURRENCY, CIRCLE_NETWORK } from "@/lib/settlement/circle/constants";
import type { SettlementIntentRow } from "@/lib/settlement/circle/store";

const probeMock = vi.fn();
const gateMock = vi.fn();
const insertMock = vi.fn();
const findIdempotencyMock = vi.fn();
const applyEvidenceMock = vi.fn();
const listMock = vi.fn();

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
    findIntentByIdempotency: (...args: unknown[]) => findIdempotencyMock(...args),
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
  createCircleWalletsPortFromEnv: () => null,
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
    idempotency_key: "demo-1",
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

describe("runCircleSettlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gateMock.mockResolvedValue({ ok: true, code: CIRCLE_PUBLIC_CODES.pending, receipt_id: "receipt-1" });
    findIdempotencyMock.mockResolvedValue(null);
    listMock.mockResolvedValue([]);
  });

  it("creates a pending intent when Circle is unavailable and does not mark it settled", async () => {
    probeMock.mockResolvedValue({
      available: false,
      schema_ready: true,
      credentials_ready: false,
      code: CIRCLE_PUBLIC_CODES.unavailable,
      feature: "circle_arc_testnet_settlement",
      activates_production: false,
      credentials: {
        api_key: false,
        entity_secret: false,
        wallet_set_id: false,
        source_wallet_id: false,
        destination_wallet_id: false,
        live_key_blocked: false,
        production_env_blocked: false,
      },
    });
    insertMock.mockResolvedValue({ ok: true, row: pendingRow(), duplicate: false });
    const result = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      receiptId: "receipt-1",
      idempotencyKey: "demo-1",
      port: null,
    });
    expect(result.ok).toBe(true);
    expect(result.code).toBe("circle_unavailable");
    expect(result.evidence?.state).toBe("pending");
    expect(result.activates_production).toBe(false);
    expect(result.intent_is_not_a_payment).toBe(true);
  });

  it("does not create an intent when the receipt gate fails closed", async () => {
    probeMock.mockResolvedValue({
      available: true,
      schema_ready: true,
      credentials_ready: true,
      code: null,
      feature: "circle_arc_testnet_settlement",
      activates_production: false,
      credentials: {
        api_key: true,
        entity_secret: true,
        wallet_set_id: true,
        source_wallet_id: true,
        destination_wallet_id: true,
        live_key_blocked: false,
        production_env_blocked: false,
      },
    });
    gateMock.mockResolvedValue({
      ok: false,
      code: CIRCLE_PUBLIC_CODES.receipt_denied,
      receipt_id: "receipt-denied",
    });
    const result = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      receiptId: "receipt-denied",
      idempotencyKey: "demo-denied",
      port: null,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("settlement_receipt_denied");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("settles from a sealed Circle COMPLETE result and blocks a duplicate", async () => {
    probeMock.mockResolvedValue({
      available: true,
      schema_ready: true,
      credentials_ready: true,
      code: null,
      feature: "circle_arc_testnet_settlement",
      activates_production: false,
      credentials: {
        api_key: true,
        entity_secret: true,
        wallet_set_id: true,
        source_wallet_id: true,
        destination_wallet_id: true,
        live_key_blocked: false,
        production_env_blocked: false,
      },
    });
    const row = pendingRow();
    insertMock.mockResolvedValueOnce({ ok: true, row, duplicate: false });
    const sealed = sealCircleAuthenticatedResult({
      providerRequestRef: "demo-1",
      circleTransactionId: "tx-1",
      network: CIRCLE_NETWORK,
      currency: CIRCLE_CURRENCY,
      amountMinor: 10_000,
      providerState: "COMPLETE",
      occurredAt: "2026-09-18T00:00:00.000Z",
    });
    applyEvidenceMock.mockResolvedValue({
      ...row,
      state: "settled",
      provider_request_ref: "demo-1",
      circle_transaction_id: "tx-1",
      provider_state: "COMPLETE",
    });
    const first = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      receiptId: "receipt-1",
      idempotencyKey: "demo-1",
      port: {
        authenticateAgainstArcTestnet: async () => ({ ok: true, network: CIRCLE_NETWORK }),
        createTestnetUsdcTransfer: async () => ({ ok: true, result: sealed }),
        getTransaction: async () => ({ ok: true, result: sealed }),
      },
    });
    expect(first.evidence?.state).toBe("settled");
    expect(first.evidence?.circle_transaction_id).toBe("tx-1");

    insertMock.mockResolvedValueOnce({
      ok: true,
      row: { ...row, state: "settled", circle_transaction_id: "tx-1" },
      duplicate: true,
    });
    const second = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      receiptId: "receipt-1",
      idempotencyKey: "demo-1",
      port: {
        authenticateAgainstArcTestnet: async () => ({ ok: true, network: CIRCLE_NETWORK }),
        createTestnetUsdcTransfer: async () => ({ ok: true, result: sealed }),
        getTransaction: async () => ({ ok: true, result: sealed }),
      },
    });
    expect(second.duplicate).toBe(true);
    expect(second.code).toBe("settlement_duplicate");
  });
});
