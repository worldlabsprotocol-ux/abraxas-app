// FILE: lib/x402/referenceGateway/x402SdkContract.test.ts
// Contract test: official @x402 SDK-generated wire values round-trip through the gateway.

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { x402Client } from "@x402/core/client";
import type { FacilitatorClient } from "@x402/core/server";
import { parsePaymentPayload, parsePaymentRequired } from "@x402/core/schemas";
import { ExactEvmScheme } from "@x402/evm";
import {
  BASE_SEPOLIA_CAIP2,
  BASE_SEPOLIA_USDC_ADDRESS,
  BASE_SEPOLIA_USDC_CAIP19,
} from "./constants";
import { handleProtectedResourceRequest } from "./gateway";
import {
  decodePaymentResponseHeader,
  decodePaymentSignatureHeader,
  hashPaymentPayload,
} from "./headers";
import { SdkX402PaymentClient } from "./facilitatorClient";
import type { ReferenceGatewayConfig } from "./types";
import {
  buildSdkPaymentRequired,
  clearX402ResourceServerCacheForTests,
  encodePaymentRequiredHeader,
  encodePaymentSignatureHeader,
  getInitializedX402ResourceServer,
  safeDecodePaymentRequiredHeader,
} from "./x402Sdk";
import {
  DURABLE_FULFILLMENT_STORE_BRAND,
  type FulfillmentStore,
} from "./fulfillmentStore";
import type { FulfillmentRecord, PaymentPayload, SettleResponse } from "./types";

const TEST_PRIVATE_KEY = generatePrivateKey();
const payerAccount = privateKeyToAccount(TEST_PRIVATE_KEY);

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

const SETTLE_TX = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

function mockFacilitator(): FacilitatorClient {
  return {
    getSupported: vi.fn().mockResolvedValue({
      kinds: [{
        x402Version: 2,
        scheme: "exact",
        network: BASE_SEPOLIA_CAIP2,
        extra: { name: "USDC", version: "2" },
      }],
      extensions: [],
    }),
    verify: vi.fn().mockResolvedValue({ isValid: true, payer: payerAccount.address }),
    settle: vi.fn().mockResolvedValue({
      success: true,
      transaction: SETTLE_TX,
      network: BASE_SEPOLIA_CAIP2,
      payer: payerAccount.address,
    }),
  };
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
    payment_response: SettleResponse;
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

  async markFailed(key: string, payment_response: SettleResponse) {
    const existing = this.records.get(key);
    if (existing) this.records.set(key, { ...existing, status: "failed", payment_response });
  }

  async markAmbiguous(key: string, payment_response: SettleResponse) {
    const existing = this.records.get(key);
    if (existing) this.records.set(key, { ...existing, status: "ambiguous", payment_response });
  }
}

describe("x402 SDK contract interoperability", () => {
  beforeEach(() => {
    clearX402ResourceServerCacheForTests();
  });

  afterEach(() => {
    clearX402ResourceServerCacheForTests();
  });

  it("builds SDK PAYMENT-REQUIRED that passes official schema validation", async () => {
    const resourceServer = await getInitializedX402ResourceServer(mockFacilitator(), "contract-required");
    const paymentRequired = await buildSdkPaymentRequired(config, resourceServer);

    const parsed = parsePaymentRequired(paymentRequired);
    expect(parsed.success).toBe(true);
    expect(paymentRequired.x402Version).toBe(2);
    expect(paymentRequired.resource.url).toBe(config.resourceUrl);
    expect(paymentRequired.accepts[0]?.asset).toBe(BASE_SEPOLIA_USDC_ADDRESS);
    expect(paymentRequired.accepts[0]?.network).toBe(BASE_SEPOLIA_CAIP2);
  });

  it("round-trips PAYMENT-REQUIRED and PAYMENT-SIGNATURE via official SDK header codecs", async () => {
    const resourceServer = await getInitializedX402ResourceServer(mockFacilitator(), "contract-headers");
    const paymentRequired = await buildSdkPaymentRequired(config, resourceServer);

    const requiredHeader = encodePaymentRequiredHeader(paymentRequired);
    const decodedRequired = safeDecodePaymentRequiredHeader(requiredHeader);
    expect(parsePaymentRequired(decodedRequired).success).toBe(true);

    const payer = new x402Client().register(BASE_SEPOLIA_CAIP2, new ExactEvmScheme(payerAccount));
    const paymentPayload = await payer.createPaymentPayload(paymentRequired);
    expect(parsePaymentPayload(paymentPayload).success).toBe(true);

    const signatureHeader = encodePaymentSignatureHeader(paymentPayload);
    const decodedPayload = decodePaymentSignatureHeader(signatureHeader);
    expect(decodedPayload).not.toBeNull();
    expect(parsePaymentPayload(decodedPayload!).success).toBe(true);
    expect(decodedPayload!.accepted.amount).toBe(paymentRequired.accepts[0]?.amount);
  });

  it("accepts SDK-generated PAYMENT-SIGNATURE and returns standards-compatible PAYMENT-RESPONSE", async () => {
    const facilitator = mockFacilitator();
    const resourceServer = await getInitializedX402ResourceServer(facilitator, "contract-gateway");
    const paymentRequired = await buildSdkPaymentRequired(config, resourceServer);

    const payer = new x402Client().register(BASE_SEPOLIA_CAIP2, new ExactEvmScheme(payerAccount));
    const paymentPayload: PaymentPayload = await payer.createPaymentPayload(paymentRequired);
    const paymentSignatureHeader = encodePaymentSignatureHeader(paymentPayload);

    const store = new MemoryFulfillmentStore();
    const result = await handleProtectedResourceRequest({
      receiptId: "dr_test",
      paymentSignatureHeader,
      decodePaymentSignature: decodePaymentSignatureHeader,
      config,
      settlementEnabled: true,
      deps: {
        fulfillmentStore: store,
        facilitator: new SdkX402PaymentClient(resourceServer),
        resourceServer,
        fetchReceipt: vi.fn().mockResolvedValue({
          ok: true,
          json: async () => validReceipt,
        }) as unknown as typeof fetch,
      },
    });

    expect(result.status).toBe(200);
    expect(result.headers["PAYMENT-RESPONSE"]).toBeTruthy();

    const settlement = decodePaymentResponseHeader(result.headers["PAYMENT-RESPONSE"]);
    expect(settlement?.success).toBe(true);
    expect(settlement?.transaction).toBe(SETTLE_TX);
    expect(settlement?.network).toBe(BASE_SEPOLIA_CAIP2);

    expect(facilitator.verify).toHaveBeenCalled();
    expect(facilitator.settle).toHaveBeenCalled();
  });

  it("rejects legacy invented PAYMENT-SIGNATURE shape (fails official schema validation)", () => {
    const legacy = {
      x402Version: 2,
      scheme: "exact",
      network: BASE_SEPOLIA_CAIP2,
      payload: { demo: true },
    };
    const header = Buffer.from(JSON.stringify(legacy), "utf8").toString("base64");
    expect(decodePaymentSignatureHeader(header)).toBeNull();
    expect(parsePaymentPayload(legacy).success).toBe(false);
  });

  it("hashes SDK payment payloads deterministically for idempotency", async () => {
    const resourceServer = await getInitializedX402ResourceServer(mockFacilitator(), "contract-hash");
    const paymentRequired = await buildSdkPaymentRequired(config, resourceServer);
    const payer = new x402Client().register(BASE_SEPOLIA_CAIP2, new ExactEvmScheme(payerAccount));
    const paymentPayload = await payer.createPaymentPayload(paymentRequired);

    const hash1 = hashPaymentPayload(paymentPayload);
    const hash2 = hashPaymentPayload(
      decodePaymentSignatureHeader(encodePaymentSignatureHeader(paymentPayload))!,
    );
    expect(hash1).toBe(hash2);
  });
});
