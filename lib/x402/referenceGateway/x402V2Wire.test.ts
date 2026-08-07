import { describe, expect, it } from "vitest";
import {
  BASE_SEPOLIA_CAIP2,
  BASE_SEPOLIA_USDC_ADDRESS,
  BASE_SEPOLIA_USDC_CAIP19,
} from "./constants";
import { buildPaymentRequired } from "./paymentRequired";
import {
  buildFailedSettlementResponse,
  buildSuccessSettlementResponse,
  isPaymentPayload,
  isPaymentRequired,
  isSettlementResponse,
  wireAssetAddressFromCaip19,
} from "./x402V2Wire";
import type { ReferenceGatewayConfig } from "./types";

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

describe("x402 v2 wire format", () => {
  it("builds PaymentRequired aligned with official schema", () => {
    const required = buildPaymentRequired(config);
    expect(isPaymentRequired(required)).toBe(true);
    expect(required.resource.url).toBe(config.resourceUrl);
    expect(required.accepts[0]?.amount).toBe("10000");
    expect(required.accepts[0]?.asset).toBe(BASE_SEPOLIA_USDC_ADDRESS);
    expect(required.accepts[0]?.network).toBe(BASE_SEPOLIA_CAIP2);
  });

  it("maps CAIP-19 config asset to ERC-20 wire address", () => {
    expect(wireAssetAddressFromCaip19(BASE_SEPOLIA_USDC_CAIP19)).toBe(BASE_SEPOLIA_USDC_ADDRESS);
  });

  it("validates official PaymentPayload shape", () => {
    const payload = {
      x402Version: 2,
      accepted: {
        scheme: "exact",
        network: BASE_SEPOLIA_CAIP2,
        amount: "10000",
        asset: BASE_SEPOLIA_USDC_ADDRESS,
        payTo: config.payTo,
        maxTimeoutSeconds: 60,
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
    expect(isPaymentPayload(payload)).toBe(true);
  });

  it("rejects legacy invented PaymentPayload with top-level scheme/network", () => {
    const legacy = {
      x402Version: 2,
      scheme: "exact",
      network: BASE_SEPOLIA_CAIP2,
      payload: { demo: true },
    };
    expect(isPaymentPayload(legacy)).toBe(false);
  });

  it("builds SettlementResponse aligned with official schema", () => {
    const success = buildSuccessSettlementResponse(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "0x857b06519E91e3A54538791bDbb0E22373e36b66",
    );
    expect(isSettlementResponse(success)).toBe(true);
    expect(success.transaction).toMatch(/^0x/);

    const failure = buildFailedSettlementResponse("verify_failed");
    expect(isSettlementResponse(failure)).toBe(true);
    expect(failure.success).toBe(false);
    expect(failure.transaction).toBe("");
  });
});
