import { describe, expect, it, vi, beforeEach } from "vitest";
import { handleProtectedResourceRequest } from "./gateway";
import { decodePaymentSignatureHeader, encodeX402Header } from "./headers";
import { buildPaymentRequired } from "./paymentRequired";
import { BASE_SEPOLIA_CAIP2 } from "./constants";
import type { FacilitatorClient } from "./facilitatorClient";
import type { FulfillmentStore } from "./fulfillmentStore";
import type {
  FulfillmentRecord,
  PaymentPayloadV2,
  ReferenceGatewayConfig,
  SettlementResponseV2,
} from "./types";

const config: ReferenceGatewayConfig = {
  partnerId: "pilot-partner",
  policyId: "pilot-policy-v1",
  abraxasPublicReceiptBaseUrl: "https://abraxas.example",
  resourceUrl: "https://partner.example/resource",
  resourceId: "synthetic-protected-resource",
  priceAmount: "10000",
  priceAsset: "eip155:84532/erc20:0x036CbD53842cBd5A0bBd5A0bBd5A0bBd5A0bBd5A0",
  network: BASE_SEPOLIA_CAIP2,
  payTo: "0x0000000000000000000000000000000000000001",
  facilitatorUrl: "https://facilitator.example",
  accessGrantTtlSec: 3600,
  allowSandbox: true,
};

const validReceipt = {
  receipt_id: "dr_test",
  partner_id: config.partnerId,
  policy_id: config.policyId,
  decision_result: "approved",
  signature_valid: true,
  status: "active",
  expires_at: new Date(Date.now() + 3600_000).toISOString(),
  production_usable: false,
};

const paymentPayload: PaymentPayloadV2 = {
  x402Version: 2,
  scheme: "exact",
  network: BASE_SEPOLIA_CAIP2,
  payload: { demo: true },
};

function paymentHeader(): string {
  return encodeX402Header(paymentPayload);
}

class MemoryFulfillmentStore implements FulfillmentStore {
  private records = new Map<string, FulfillmentRecord>();

  async getByIdempotencyKey(key: string) {
    return this.records.get(key) ?? null;
  }

  async insertPending(record: FulfillmentRecord) {
    if (this.records.has(record.idempotency_key)) return "conflict" as const;
    this.records.set(record.idempotency_key, record);
    return "inserted" as const;
  }

  async markSettled(key: string, update: {
    settlement_ref: string;
    payment_response: SettlementResponseV2;
    access_grant_expires_at: string;
  }) {
    const existing = this.records.get(key);
    if (!existing) return "missing" as const;
    if (existing.status === "settled") return "conflict" as const;
    this.records.set(key, {
      ...existing,
      status: "settled",
      settlement_ref: update.settlement_ref,
      payment_response: update.payment_response,
      access_grant_expires_at: update.access_grant_expires_at,
    });
    return "updated" as const;
  }

  async markFailed(key: string, payment_response: SettlementResponseV2) {
    const existing = this.records.get(key);
    if (existing) this.records.set(key, { ...existing, status: "failed", payment_response });
  }

  async markAmbiguous(key: string, payment_response: SettlementResponseV2) {
    const existing = this.records.get(key);
    if (existing) this.records.set(key, { ...existing, status: "ambiguous", payment_response });
  }
}

function mockFetchReceipt() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => validReceipt,
  }) as unknown as typeof fetch;
}

describe("handleProtectedResourceRequest", () => {
  let store: MemoryFulfillmentStore;
  let facilitator: FacilitatorClient;

  beforeEach(() => {
    store = new MemoryFulfillmentStore();
    facilitator = {
      verify: vi.fn().mockResolvedValue({ ok: true }),
      settle: vi.fn().mockResolvedValue({ status: "settled", settlementRef: "settle-ref-1" }),
    };
  });

  it("returns 402 PAYMENT-REQUIRED when payment is absent", async () => {
    const result = await handleProtectedResourceRequest({
      receiptId: "dr_test",
      paymentSignatureHeader: null,
      decodePaymentSignature: decodePaymentSignatureHeader,
      config,
      deps: { fulfillmentStore: store, facilitator, fetchReceipt: mockFetchReceipt() },
    });

    expect(result.status).toBe(402);
    expect(result.headers["PAYMENT-REQUIRED"]).toBeTruthy();
    expect(result.body.code).toBe("payment_required");
    expect(facilitator.verify).not.toHaveBeenCalled();
  });

  it("returns 403 when receipt validation fails", async () => {
    const badFetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    const result = await handleProtectedResourceRequest({
      receiptId: "dr_missing",
      paymentSignatureHeader: null,
      decodePaymentSignature: decodePaymentSignatureHeader,
      config,
      deps: { fulfillmentStore: store, facilitator, fetchReceipt: badFetch },
    });

    expect(result.status).toBe(403);
    expect(result.body.code).toBe("receipt_not_found");
  });

  it("returns 200 with PAYMENT-RESPONSE after canonical payment success", async () => {
    const result = await handleProtectedResourceRequest({
      receiptId: "dr_test",
      paymentSignatureHeader: paymentHeader(),
      decodePaymentSignature: decodePaymentSignatureHeader,
      config,
      deps: { fulfillmentStore: store, facilitator, fetchReceipt: mockFetchReceipt() },
    });

    expect(result.status).toBe(200);
    expect(result.headers["PAYMENT-RESPONSE"]).toBeTruthy();
    expect(result.body.resource_id).toBe(config.resourceId);
    expect(facilitator.settle).toHaveBeenCalled();
  });

  it("returns idempotent 200 on replayed PAYMENT-SIGNATURE", async () => {
    const deps = { fulfillmentStore: store, facilitator, fetchReceipt: mockFetchReceipt() };
    const input = {
      receiptId: "dr_test",
      paymentSignatureHeader: paymentHeader(),
      decodePaymentSignature: decodePaymentSignatureHeader,
      config,
      deps,
    };

    const first = await handleProtectedResourceRequest(input);
    const second = await handleProtectedResourceRequest(input);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(facilitator.settle).toHaveBeenCalledTimes(1);
  });

  it("returns 402 on facilitator verify failure without fulfilling", async () => {
    facilitator.verify = vi.fn().mockResolvedValue({ ok: false, error: "invalid" });
    const result = await handleProtectedResourceRequest({
      receiptId: "dr_test",
      paymentSignatureHeader: paymentHeader(),
      decodePaymentSignature: decodePaymentSignatureHeader,
      config,
      deps: { fulfillmentStore: store, facilitator, fetchReceipt: mockFetchReceipt() },
    });

    expect(result.status).toBe(402);
    expect(result.body.code).toBe("payment_verify_failed");
    expect(facilitator.settle).not.toHaveBeenCalled();
  });

  it("returns 409 on ambiguous settlement without fulfilling", async () => {
    facilitator.settle = vi.fn().mockResolvedValue({ status: "ambiguous", error: "timeout" });
    const result = await handleProtectedResourceRequest({
      receiptId: "dr_test",
      paymentSignatureHeader: paymentHeader(),
      decodePaymentSignature: decodePaymentSignatureHeader,
      config,
      deps: { fulfillmentStore: store, facilitator, fetchReceipt: mockFetchReceipt() },
    });

    expect(result.status).toBe(409);
    expect(result.body.code).toBe("settlement_ambiguous");
  });

  it("suggests legacy recovery path via payment required shape", () => {
    const required = buildPaymentRequired(config);
    expect(required.x402Version).toBe(2);
    expect(required.accepts[0]?.network).toBe(BASE_SEPOLIA_CAIP2);
  });
});
