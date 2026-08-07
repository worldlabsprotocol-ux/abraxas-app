// FILE: lib/x402/referenceGateway/paymentRequired.ts
// Build x402 v2 PAYMENT-REQUIRED payloads for Base Sepolia testnet.

import { X402_PROTOCOL_VERSION } from "./constants";
import type { PaymentRequired, ReferenceGatewayConfig } from "./types";
import { baseSepoliaUsdcWireRequirements, wireAssetAddressFromCaip19 } from "./x402V2Wire";

export function buildPaymentRequired(config: ReferenceGatewayConfig): PaymentRequired {
  wireAssetAddressFromCaip19(config.priceAssetCaip19);

  return {
    x402Version: X402_PROTOCOL_VERSION,
    error: "PAYMENT-SIGNATURE header is required",
    resource: {
      url: config.resourceUrl,
      description: `${config.resourceId} (TESTNET demo — Base Sepolia only)`,
      mimeType: "application/json",
      serviceName: "Abraxas x402 ref gateway",
      tags: ["testnet", "demo"],
    },
    accepts: [
      baseSepoliaUsdcWireRequirements({
        amount: config.priceAmount,
        payTo: config.payTo,
      }),
    ],
    extensions: {},
  };
}

/** Single PaymentRequirements entry for facilitator /verify and /settle requests. */
export function buildPrimaryPaymentRequirements(config: ReferenceGatewayConfig) {
  return buildPaymentRequired(config).accepts[0]!;
}
