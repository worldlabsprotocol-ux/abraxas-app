// FILE: lib/x402/referenceGateway/x402Sdk.ts
// Official @x402/core + @x402/evm server integration for Base Sepolia testnet.

import {
  HTTPFacilitatorClient,
  x402ResourceServer,
  type FacilitatorClient,
} from "@x402/core/server";
import {
  decodePaymentRequiredHeader as sdkDecodePaymentRequiredHeader,
  decodePaymentResponseHeader as sdkDecodePaymentResponseHeader,
  decodePaymentSignatureHeader as sdkDecodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  encodePaymentSignatureHeader,
} from "@x402/core/http";
import type {
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  ResourceInfo,
  SettleResponse,
} from "@x402/core/types";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { BASE_SEPOLIA_CAIP2 } from "./constants";
import type { ReferenceGatewayConfig } from "./types";
import { wireAssetAddressFromCaip19 } from "./configValidation";

const resourceServerCache = new Map<string, Promise<x402ResourceServer>>();

export function clearX402ResourceServerCacheForTests(): void {
  resourceServerCache.clear();
}

function createResourceServer(facilitator: FacilitatorClient): x402ResourceServer {
  const server = new x402ResourceServer(facilitator);
  registerExactEvmScheme(server, { networks: [BASE_SEPOLIA_CAIP2] });
  return server;
}

export async function getInitializedX402ResourceServer(
  facilitator: FacilitatorClient,
  cacheKey = "default",
): Promise<x402ResourceServer> {
  const existing = resourceServerCache.get(cacheKey);
  if (existing) return existing;

  const initPromise = (async () => {
    const server = createResourceServer(facilitator);
    await server.initialize();
    return server;
  })();

  resourceServerCache.set(cacheKey, initPromise);
  try {
    return await initPromise;
  } catch (error) {
    resourceServerCache.delete(cacheKey);
    throw error;
  }
}

export async function getHttpX402ResourceServer(
  facilitatorUrl: string,
): Promise<x402ResourceServer> {
  const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl.replace(/\/$/, "") });
  return getInitializedX402ResourceServer(facilitator, facilitatorUrl);
}

function resourceInfoFromConfig(config: ReferenceGatewayConfig): ResourceInfo {
  return {
    url: config.resourceUrl,
    description: `${config.resourceId} (TESTNET demo — Base Sepolia only)`,
    mimeType: "application/json",
  };
}

export async function buildSdkPaymentRequired(
  config: ReferenceGatewayConfig,
  resourceServer: x402ResourceServer,
): Promise<PaymentRequired> {
  const requirements = await resourceServer.buildPaymentRequirements({
    scheme: "exact",
    network: BASE_SEPOLIA_CAIP2,
    payTo: config.payTo,
    price: {
      amount: config.priceAmount,
      asset: wireAssetAddressFromCaip19(config.priceAssetCaip19),
    },
    maxTimeoutSeconds: 300,
    extra: { name: "USDC", version: "2" },
  });

  return resourceServer.createPaymentRequiredResponse(
    requirements,
    resourceInfoFromConfig(config),
    "PAYMENT-SIGNATURE header is required",
  );
}

export function primaryPaymentRequirements(
  paymentRequired: PaymentRequired,
): PaymentRequirements {
  return paymentRequired.accepts[0]!;
}

export function findMatchingPaymentRequirements(
  resourceServer: x402ResourceServer,
  paymentRequired: PaymentRequired,
  paymentPayload: PaymentPayload,
): PaymentRequirements | undefined {
  return resourceServer.findMatchingRequirements(paymentRequired.accepts, paymentPayload);
}

export function buildFailedSettlementResponse(errorReason: string): SettleResponse {
  return {
    success: false,
    errorReason,
    transaction: "",
    network: BASE_SEPOLIA_CAIP2,
  };
}

export function buildSuccessSettlementResponse(
  transaction: string,
  payer?: string,
): SettleResponse {
  return {
    success: true,
    transaction,
    network: BASE_SEPOLIA_CAIP2,
    ...(payer ? { payer } : {}),
  };
}

export {
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  encodePaymentSignatureHeader,
};

export function safeDecodePaymentSignatureHeader(
  raw: string | null | undefined,
): PaymentPayload | null {
  if (!raw?.trim()) return null;
  try {
    return sdkDecodePaymentSignatureHeader(raw.trim());
  } catch {
    return null;
  }
}

export function safeDecodePaymentRequiredHeader(
  raw: string | null | undefined,
): PaymentRequired | null {
  if (!raw?.trim()) return null;
  try {
    return sdkDecodePaymentRequiredHeader(raw.trim());
  } catch {
    return null;
  }
}

export function safeDecodePaymentResponseHeader(
  raw: string | null | undefined,
): SettleResponse | null {
  if (!raw?.trim()) return null;
  try {
    return sdkDecodePaymentResponseHeader(raw.trim());
  } catch {
    return null;
  }
}
