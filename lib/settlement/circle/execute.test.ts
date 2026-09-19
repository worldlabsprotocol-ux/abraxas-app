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
const getIntentMock = vi.fn();
const claimMock = vi.fn();
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
    getIntentForPartner: (...args: unknown[]) => getIntentMock(...args),
    claimPendingIntentForSubmit: (...args: unknown[]) => claimMock(...args),
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

import { runCircleSettlement, submitCircleSettlementIntent } from "@/lib/settlement/circle/execute";
import {
  resetEligibleReceiptSelectionReplayForTests,
  signEligibleReceiptSelection,
} from "@/lib/settlement/circle/eligibleReceiptSelection";

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

const INTENT_ID = "00000000-0000-4000-8000-000000000001";

function pendingRow(): SettlementIntentRow {
  return {
    id: INTENT_ID,
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

describe("runCircleSettlement create-intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEligibleReceiptSelectionReplayForTests();
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-settlement-selection-secret";
    createPortMock.mockReturnValue(null);
    gateMock.mockResolvedValue({ ok: true, code: CIRCLE_PUBLIC_CODES.pending, receipt_id: "receipt-1" });
    listMock.mockResolvedValue([]);
  });

  async function selectionToken(overrides: Partial<{
    receiptId: string;
    partnerId: string;
    applicationId: string;
    policyId: string;
    policyVersion: number;
    sessionKeyId: string;
  }> = {}) {
    return signEligibleReceiptSelection({
      receiptId: "receipt-1",
      partnerId: "acme",
      applicationId: "app-1",
      policyId: "policy-1",
      policyVersion: 1,
      sessionKeyId: "key-1",
      ...overrides,
    });
  }

  it("creates a pending intent with zero Circle calls when configured", async () => {
    probeMock.mockResolvedValue(readyAvailability());
    insertMock.mockResolvedValue({ ok: true, row: pendingRow(), duplicate: false });
    const transfer = vi.fn();
    createPortMock.mockReturnValue({
      authenticateAgainstArcTestnet: vi.fn(),
      createTestnetUsdcTransfer: transfer,
      getTransaction: vi.fn(),
    });
    const token = await selectionToken();
    const result = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      sessionKeyId: "key-1",
      selectionToken: token,
      body: { selection_token: token },
    });
    expect(result.ok).toBe(true);
    expect(result.code).toBe("settlement_pending");
    expect(result.evidence?.state).toBe("pending");
    expect(result.evidence?.intent_id).toBe(INTENT_ID);
    expect(result.evidence?.circle_transaction_id).toBeNull();
    expect(createPortMock).not.toHaveBeenCalled();
    expect(transfer).not.toHaveBeenCalled();
    expect(gateMock).toHaveBeenCalledWith(expect.objectContaining({ receiptId: "receipt-1" }));
  });

  it("creates a pending intent when Circle is unavailable and does not mark it settled", async () => {
    probeMock.mockResolvedValue(unavailableAvailability());
    insertMock.mockResolvedValue({ ok: true, row: pendingRow(), duplicate: false });
    const token = await selectionToken();
    const result = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      sessionKeyId: "key-1",
      selectionToken: token,
      body: { selection_token: token },
    });
    expect(result.ok).toBe(true);
    expect(result.code).toBe("settlement_pending");
    expect(result.evidence?.state).toBe("pending");
    expect(createPortMock).not.toHaveBeenCalled();
  });

  it("does not create an intent when the receipt gate fails closed", async () => {
    probeMock.mockResolvedValue(readyAvailability());
    gateMock.mockResolvedValue({
      ok: false,
      code: CIRCLE_PUBLIC_CODES.receipt_denied,
      receipt_id: "receipt-denied",
    });
    const token = await selectionToken({ receiptId: "receipt-denied" });
    const result = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      sessionKeyId: "key-1",
      selectionToken: token,
      body: { selection_token: token },
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("settlement_receipt_denied");
    expect(insertMock).not.toHaveBeenCalled();
    expect(createPortMock).not.toHaveBeenCalled();
  });

  it("rejects client receipt ids and does not call Circle", async () => {
    probeMock.mockResolvedValue(readyAvailability());
    const result = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      sessionKeyId: "key-1",
      selectionToken: "ignored",
      body: { receipt_id: "receipt-1", selection_token: "ignored" },
    });
    expect(result.code).toBe("settlement_client_override_rejected");
    expect(gateMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(createPortMock).not.toHaveBeenCalled();
  });

  it("fails closed on tampered, expired, replayed, and cross-tenant tokens", async () => {
    probeMock.mockResolvedValue(readyAvailability());
    insertMock.mockResolvedValue({ ok: true, row: pendingRow(), duplicate: false });
    const fresh = await selectionToken();
    const tampered = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      sessionKeyId: "key-1",
      selectionToken: `${fresh}aa`,
      body: { selection_token: `${fresh}aa` },
    });
    expect(tampered.code).toBe("settlement_selection_invalid");

    const expiredToken = await signEligibleReceiptSelection({
      receiptId: "receipt-1",
      partnerId: "acme",
      applicationId: "app-1",
      policyId: "policy-1",
      policyVersion: 1,
      sessionKeyId: "key-1",
    }, Date.now() - 11 * 60 * 1000);
    const expired = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      sessionKeyId: "key-1",
      selectionToken: expiredToken,
      body: { selection_token: expiredToken },
    });
    expect(expired.code).toBe("settlement_selection_expired");

    const crossToken = await selectionToken({ partnerId: "other", applicationId: "app-other" });
    const cross = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      sessionKeyId: "key-1",
      selectionToken: crossToken,
      body: { selection_token: crossToken },
    });
    expect(cross.code).toBe("settlement_selection_cross_tenant");

    const replayToken = await selectionToken();
    const first = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      sessionKeyId: "key-1",
      selectionToken: replayToken,
      body: { selection_token: replayToken },
    });
    expect(first.ok).toBe(true);
    const replay = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      sessionKeyId: "key-1",
      selectionToken: replayToken,
      body: { selection_token: replayToken },
    });
    expect(replay.code).toBe("settlement_selection_replay");
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("returns the existing pending intent on duplicate create without Circle", async () => {
    probeMock.mockResolvedValue(readyAvailability());
    insertMock.mockResolvedValue({ ok: true, row: pendingRow(), duplicate: true });
    const token = await selectionToken();
    const result = await runCircleSettlement({
      application: app,
      partnerId: "acme",
      sessionKeyId: "key-1",
      selectionToken: token,
      body: { selection_token: token },
    });
    expect(result.duplicate).toBe(true);
    expect(result.evidence?.state).toBe("pending");
    expect(createPortMock).not.toHaveBeenCalled();
  });

  it("allocates distinct Circle keys when two applications share the same receipt", async () => {
    probeMock.mockResolvedValue(unavailableAvailability());
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
    const firstToken = await selectionToken({ applicationId: "app-a" });
    const secondToken = await selectionToken({ applicationId: "app-b" });
    const first = await runCircleSettlement({
      application: { ...app, id: "app-a" },
      partnerId: "acme",
      sessionKeyId: "key-1",
      selectionToken: firstToken,
      body: { selection_token: firstToken },
    });
    const second = await runCircleSettlement({
      application: { ...app, id: "app-b" },
      partnerId: "acme",
      sessionKeyId: "key-1",
      selectionToken: secondToken,
      body: { selection_token: secondToken },
    });
    expect(first.evidence?.idempotency_key).not.toBe(second.evidence?.idempotency_key);
    expect(insertMock.mock.calls[0][0].idempotencyKey).toBeUndefined();
    expect(createPortMock).not.toHaveBeenCalled();
  });
});

describe("submitCircleSettlementIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    probeMock.mockResolvedValue(readyAvailability());
    gateMock.mockResolvedValue({ ok: true, code: CIRCLE_PUBLIC_CODES.pending, receipt_id: "receipt-1" });
  });

  it("makes one Circle transfer call and settles only on COMPLETE", async () => {
    const row = pendingRow();
    getIntentMock.mockResolvedValue(row);
    claimMock.mockResolvedValue({ ...row, state: "submitted" });
    const sealed = sealCircleAuthenticatedResult({
      providerRequestRef: row.idempotency_key,
      circleTransactionId: "tx-1",
      network: CIRCLE_NETWORK,
      currency: CIRCLE_CURRENCY,
      amountMinor: 10_000,
      providerState: "COMPLETE",
      occurredAt: "2026-09-18T00:00:00.000Z",
    });
    const transfer = vi.fn(async (input: { idempotencyKey: string }) => {
      expect(input.idempotencyKey).toBe(row.idempotency_key);
      return { ok: true, result: sealed };
    });
    createPortMock.mockReturnValue({
      authenticateAgainstArcTestnet: async () => ({ ok: true, network: CIRCLE_NETWORK }),
      createTestnetUsdcTransfer: transfer,
      getTransaction: vi.fn(),
    });
    applyEvidenceMock.mockResolvedValue({
      ...row,
      state: "settled",
      provider_request_ref: row.idempotency_key,
      circle_transaction_id: "tx-1",
      provider_state: "COMPLETE",
    });
    const first = await submitCircleSettlementIntent({
      application: app,
      partnerId: "acme",
      intentId: INTENT_ID,
      body: { intent_id: INTENT_ID, confirm_testnet_transfer: true },
    });
    expect(first.ok).toBe(true);
    expect(first.evidence?.state).toBe("settled");
    expect(transfer).toHaveBeenCalledTimes(1);

    getIntentMock.mockResolvedValue({ ...row, state: "settled", circle_transaction_id: "tx-1" });
    const second = await submitCircleSettlementIntent({
      application: app,
      partnerId: "acme",
      intentId: INTENT_ID,
      body: { intent_id: INTENT_ID, confirm_testnet_transfer: true },
    });
    expect(second.ok).toBe(false);
    expect(second.code).toBe("settlement_not_pending");
    expect(transfer).toHaveBeenCalledTimes(1);
    expect(claimMock).toHaveBeenCalledTimes(1);
  });

  it("rejects missing confirmation, client amount, and wallet overrides without Circle", async () => {
    const transfer = vi.fn();
    createPortMock.mockReturnValue({ createTestnetUsdcTransfer: transfer });
    const missing = await submitCircleSettlementIntent({
      application: app,
      partnerId: "acme",
      intentId: INTENT_ID,
      body: { intent_id: INTENT_ID },
    });
    expect(missing.code).toBe("settlement_confirm_required");
    const amount = await submitCircleSettlementIntent({
      application: app,
      partnerId: "acme",
      intentId: INTENT_ID,
      body: { intent_id: INTENT_ID, confirm_testnet_transfer: true, amount_minor: 99 },
    });
    expect(amount.code).toBe("settlement_client_override_rejected");
    const wallet = await submitCircleSettlementIntent({
      application: app,
      partnerId: "acme",
      intentId: INTENT_ID,
      body: { intent_id: INTENT_ID, confirm_testnet_transfer: true, wallet_address: "0xabc" },
    });
    expect(wallet.code).toBe("settlement_client_hash_rejected");
    expect(transfer).not.toHaveBeenCalled();
    expect(getIntentMock).not.toHaveBeenCalled();
  });

  it("rejects cross-partner access and invalid receipts without Circle", async () => {
    const transfer = vi.fn();
    createPortMock.mockReturnValue({ createTestnetUsdcTransfer: transfer });
    getIntentMock.mockResolvedValueOnce(null);
    const missing = await submitCircleSettlementIntent({
      application: app,
      partnerId: "other",
      intentId: INTENT_ID,
      body: { intent_id: INTENT_ID, confirm_testnet_transfer: true },
    });
    expect(missing.code).toBe("settlement_intent_not_found");

    getIntentMock.mockResolvedValueOnce(pendingRow());
    gateMock.mockResolvedValueOnce({
      ok: false,
      code: CIRCLE_PUBLIC_CODES.receipt_revoked,
      receipt_id: "receipt-1",
    });
    const revoked = await submitCircleSettlementIntent({
      application: app,
      partnerId: "acme",
      intentId: INTENT_ID,
      body: { intent_id: INTENT_ID, confirm_testnet_transfer: true },
    });
    expect(revoked.code).toBe("settlement_receipt_revoked");
    expect(claimMock).not.toHaveBeenCalled();
    expect(transfer).not.toHaveBeenCalled();
  });

  it("leaves the intent pending-only when the provider fails after claim", async () => {
    const row = pendingRow();
    getIntentMock.mockResolvedValue(row);
    claimMock.mockResolvedValue({ ...row, state: "submitted" });
    const transfer = vi.fn(async () => ({ ok: false, code: CIRCLE_PUBLIC_CODES.unavailable }));
    createPortMock.mockReturnValue({
      authenticateAgainstArcTestnet: async () => ({ ok: true, network: CIRCLE_NETWORK }),
      createTestnetUsdcTransfer: transfer,
      getTransaction: vi.fn(),
    });
    const result = await submitCircleSettlementIntent({
      application: app,
      partnerId: "acme",
      intentId: INTENT_ID,
      body: { intent_id: INTENT_ID, confirm_testnet_transfer: true },
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("circle_unavailable");
    expect(result.evidence?.state).toBe("submitted");
    expect(result.evidence?.circle_transaction_id).toBeNull();
    expect(transfer).toHaveBeenCalledTimes(1);
    expect(applyEvidenceMock).not.toHaveBeenCalled();
  });
});
