// FILE: lib/x402/referenceGateway/config.ts
// Resolve reference gateway config from env — testnet demo only, no secrets.

import {
  BASE_SEPOLIA_CAIP2,
  BASE_SEPOLIA_USDC_CAIP19,
  REFERENCE_GATEWAY_RESOURCE_ID,
} from "./constants";
import {
  validateReferenceGatewayConfigInput,
  type ConfigValidationResult,
} from "./configValidation";
import type { ReferenceGatewayConfig } from "./types";

export const REFERENCE_GATEWAY_ENV = {
  enabled: "X402_REF_GATEWAY_ENABLED",
  partnerId: "X402_REF_PARTNER_ID",
  policyId: "X402_REF_POLICY_ID",
  abraxasBaseUrl: "X402_REF_ABRAXAS_BASE_URL",
  facilitatorUrl: "X402_REF_FACILITATOR_URL",
  payTo: "X402_REF_PAY_TO",
  priceAmount: "X402_REF_PRICE_AMOUNT",
  priceAsset: "X402_REF_PRICE_ASSET",
  resourceUrl: "X402_REF_RESOURCE_URL",
  fulfillmentStorePath: "X402_REF_FULFILLMENT_STORE_PATH",
} as const;

export interface ResolveReferenceGatewayConfigResult {
  config: ReferenceGatewayConfig | null;
  missing: string[];
  validation: ConfigValidationResult | null;
  enabled: boolean;
}

export function resolveReferenceGatewayConfig(
  env: Record<string, string | undefined> = process.env,
): ResolveReferenceGatewayConfigResult {
  const enabled = env[REFERENCE_GATEWAY_ENV.enabled]?.trim() === "true";
  if (!enabled) {
    return {
      config: null,
      missing: [REFERENCE_GATEWAY_ENV.enabled],
      validation: null,
      enabled: false,
    };
  }

  const missing: string[] = [];
  const partnerId = env[REFERENCE_GATEWAY_ENV.partnerId]?.trim() ?? "";
  const policyId = env[REFERENCE_GATEWAY_ENV.policyId]?.trim() ?? "";
  const abraxasPublicReceiptBaseUrl = env[REFERENCE_GATEWAY_ENV.abraxasBaseUrl]?.trim() ?? "";
  const facilitatorUrl = env[REFERENCE_GATEWAY_ENV.facilitatorUrl]?.trim() ?? "";
  const payTo = env[REFERENCE_GATEWAY_ENV.payTo]?.trim() ?? "";
  const resourceUrl = env[REFERENCE_GATEWAY_ENV.resourceUrl]?.trim() ?? "";

  if (!partnerId) missing.push(REFERENCE_GATEWAY_ENV.partnerId);
  if (!policyId) missing.push(REFERENCE_GATEWAY_ENV.policyId);
  if (!abraxasPublicReceiptBaseUrl) missing.push(REFERENCE_GATEWAY_ENV.abraxasBaseUrl);
  if (!facilitatorUrl) missing.push(REFERENCE_GATEWAY_ENV.facilitatorUrl);
  if (!payTo) missing.push(REFERENCE_GATEWAY_ENV.payTo);
  if (!resourceUrl) missing.push(REFERENCE_GATEWAY_ENV.resourceUrl);

  if (missing.length > 0) {
    return { config: null, missing, validation: null, enabled: true };
  }

  const priceAmount = env[REFERENCE_GATEWAY_ENV.priceAmount]?.trim() || "10000";
  const priceAssetCaip19 = env[REFERENCE_GATEWAY_ENV.priceAsset]?.trim() || BASE_SEPOLIA_USDC_CAIP19;

  const validation = validateReferenceGatewayConfigInput({
    partnerId,
    policyId,
    abraxasPublicReceiptBaseUrl: abraxasPublicReceiptBaseUrl.replace(/\/$/, ""),
    facilitatorUrl: facilitatorUrl.replace(/\/$/, ""),
    payTo,
    resourceUrl,
    priceAmount,
    priceAssetCaip19,
    network: BASE_SEPOLIA_CAIP2,
  });

  if (!validation.valid) {
    return { config: null, missing: [], validation, enabled: true };
  }

  return {
    enabled: true,
    missing: [],
    validation,
    config: {
      partnerId,
      policyId,
      abraxasPublicReceiptBaseUrl: abraxasPublicReceiptBaseUrl.replace(/\/$/, ""),
      resourceUrl,
      resourceId: REFERENCE_GATEWAY_RESOURCE_ID,
      priceAmount,
      priceAssetCaip19,
      network: BASE_SEPOLIA_CAIP2,
      payTo,
      facilitatorUrl: facilitatorUrl.replace(/\/$/, ""),
      accessGrantTtlSec: 3600,
      allowSandbox: true,
    },
  };
}
