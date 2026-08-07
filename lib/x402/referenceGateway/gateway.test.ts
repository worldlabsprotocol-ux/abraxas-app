import { describe, expect, it, vi, beforeEach } from "vitest";
import { handleProtectedResourceRequest } from "./gateway";
import { buildFulfillmentIdempotencyKey } from "./idempotency";
import { decodePaymentSignatureHeader, encodeX402Header, hashPaymentPayload } from "./headers";
import { buildPaymentRequired } from "./paymentRequired";
import {
  BASE_SEPOLIA_CAIP2,
  BASE_SEPOLIA_USDC_ADDRESS,
  BASE_SEPOLIA_USDC_CAIP19,
} from "./constants";
import type { FacilitatorClient } from "./facilitatorClient";
import {
  DURABLE_FULFILLMENT_STORE_BRAND,
  type FulfillmentStore,
} from "./fulfillmentStore";
import type {
  FulfillmentRecord,
  PaymentPayload,
  ReferenceGatewayConfig,
  SettlementResponse,
} from "./types";

const config: ReferenceGatewayConfig = {
  partnerId: "pilot-partner",
  policyId: "pilot-policy-v1",
  abraxasPublicReceiptBaseUrl: "https://abraxas.example",
  resourceUrl: "https://partner.example/resource",
  resourceId: "synthetic-protected-resource",
  priceAmount: "10000",
  priceAssetCaip19: BASE_SEPOLIA_USDC_CAIP19,
  network: BASE_SEPOLIA_CAIP2,
  payTo: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
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

const paymentPayload: PaymentPayload = {
  x402Version: 2,
  accepted: {
    scheme: "exact",
    network: BASE_SEPOLIA_CAIP2,
    amount: "10000",
    asset: BASE_SEPOLIA_USDC_ADDRESS,
    payTo: config.payTo,
    maxTimeoutSeconds: 300,
  },
  payload: {
    signature: "0xabc",
    authorization: {
      from: "0x857b06519E91e3A54538791bDbb0E22373e36b66",
      to: config.payTo,
      value: "10000",
      validAfter: "1740672089",
      validBefore: "1740672154",
      nonce: "0xf3746613c2d920b5fdabc0856f2aeb2d4f88ee6037b8cc5d04a71a4462f13480",
    },
  },
};

function paymentHeader(): string {
  return encodeX402Header(paymentPayload);
}

class MemoryFulfillmentStore implements FulfillmentStore {
  readonly [DURABLE_FULFILLMENT_STORE_BRAND] = true as const;
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
    payment_response: SettlementResponse;
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

  async markFailed(key: string, payment_response: SettlementResponse) {
    const existing = this.records.get(key);
    if (existing) this.records.set(key, { ...existing, status: "failed", payment_response });
  }

  async markAmbiguous(key: string, payment_response: SettlementResponse) {
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
      settle: vi.fn().mockResolvedValue({
        status: "settled",
        transaction: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      }),
    };
  });

  it("returns 402 PAYMENT-REQUIRED when payment is absent", async () => {
    const result = await handleProtectedResourceRequest({
      receiptId: "dr_test",
      paymentSignatureHeader: null,
      decodePaymentSignature: decodePaymentSignatureHeader,
      config,
      settlementEnabled: true,
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
      settlementEnabled: true,
      deps: { fulfillmentStore: store, facilitator, fetchReceipt: badFetch },
    });

    expect(result.status).toBe(403);
    expect(result.body.code).toBe("receipt_not_found");
  });

  it("returns 503 when settlement is disabled (no durable store)", async () => {
    const result = await handleProtectedResourceRequest({
      receiptId: "dr_test",
      paymentSignatureHeader: paymentHeader(),
      decodePaymentSignature: decodePaymentSignatureHeader,
      config,
      settlementEnabled: false,
      deps: { fulfillmentStore: store, facilitator, fetchReceipt: mockFetchReceipt() },
    });

    expect(result.status).toBe(503);
    expect(result.body.code).toBe("settlement_unavailable");
    expect(facilitator.verify).not.toHaveBeenCalled();
    expect(facilitator.settle).not.toHaveBeenCalled();
  });

  it("returns 200 with PAYMENT-RESPONSE after canonical payment success", async () => {
    const result = await handleProtectedResourceRequest({
      receiptId: "dr_test",
      paymentSignatureHeader: paymentHeader(),
      decodePaymentSignature: decodePaymentSignatureHeader,
      config,
      settlementEnabled: true,
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
      settlementEnabled: true,
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
      settlementEnabled: true,
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
      settlementEnabled: true,
      deps: { fulfillmentStore: store, facilitator, fetchReceipt: mockFetchReceipt() },
    });

    expect(result.status).toBe(409);
    expect(result.body.code).toBe("settlement_ambiguous");
  });

  it("emits official x402 v2 PAYMENT-REQUIRED shape", () => {
    const required = buildPaymentRequired(config);
    expect(required.x402Version).toBe(2);
    expect(required.resource.url).toBe(config.resourceUrl);
    expect(required.accepts[0]?.network).toBe(BASE_SEPOLIA_CAIP2);
    expect(required.accepts[0]?.amount).toBe("10000");
    expect(required.accepts[0]?.asset).toBe(BASE_SEPOLIA_USDC_ADDRESS);
  });

  it("stores official SettlementResponse on success", async () => {
    const tx = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    facilitator.settle = vi.fn().mockResolvedValue({ status: "settled", transaction: tx });
    await handleProtectedResourceRequest({
      receiptId: "dr_test",
      paymentSignatureHeader: paymentHeader(),
      decodePaymentSignature: decodePaymentSignatureHeader,
      config,
      settlementEnabled: true,
      deps: { fulfillmentStore: store, facilitator, fetchReceipt: mockFetchReceipt() },
    });

    const record = await store.getByIdempotencyKey(buildFulfillmentIdempotencyKey({
      partnerId: config.partnerId,
      resourceId: config.resourceId,
      receiptId: "dr_test",
      paymentPayloadHash: hashPaymentPayload(paymentPayload),
    }));
    expect(record?.payment_response.transaction).toBe(tx);
    expect(record?.payment_response.success).toBe(true);
  });
});
