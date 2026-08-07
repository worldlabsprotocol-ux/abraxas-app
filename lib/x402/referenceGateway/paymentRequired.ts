// FILE: lib/x402/referenceGateway/paymentRequired.ts
// Build x402 v2 PAYMENT-REQUIRED payloads for Base Sepolia testnet.

import { X402_PROTOCOL_VERSION } from "./constants";
import type { PaymentRequiredV2, ReferenceGatewayConfig } from "./types";

export function buildPaymentRequired(config: ReferenceGatewayConfig): PaymentRequiredV2 {
  return {
    x402Version: X402_PROTOCOL_VERSION,
    accepts: [
      {
        scheme: "exact",
        network: config.network,
        maxAmountRequired: config.priceAmount,
        resource: config.resourceUrl,
        description: `${config.resourceId} (TESTNET demo — Base Sepolia only)`,
        payTo: config.payTo,
        asset: config.priceAsset,
        maxTimeoutSeconds: 300,
      },
    ],
  };
}
