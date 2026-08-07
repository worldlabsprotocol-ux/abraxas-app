// FILE: lib/x402/referenceGateway/paymentRequired.ts
// Build x402 v2 PAYMENT-REQUIRED via official @x402/core server SDK.

import type { PaymentRequired, ReferenceGatewayConfig } from "./types";
import type { x402ResourceServer } from "@x402/core/server";
import { buildSdkPaymentRequired, getHttpX402ResourceServer } from "./x402Sdk";

export async function buildPaymentRequired(
  config: ReferenceGatewayConfig,
  resourceServer?: x402ResourceServer,
): Promise<PaymentRequired> {
  const server = resourceServer ?? await getHttpX402ResourceServer(config.facilitatorUrl);
  return buildSdkPaymentRequired(config, server);
}
