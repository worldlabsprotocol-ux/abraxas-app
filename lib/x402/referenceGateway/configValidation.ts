// FILE: lib/x402/referenceGateway/configValidation.ts
// Startup validation for operator-supplied reference gateway configuration.

import {
  BASE_SEPOLIA_CAIP2,
  BASE_SEPOLIA_USDC_CAIP19,
} from "./constants";
import { isEvmAddress, isPositiveAtomicAmount } from "./x402V2Wire";
import type { ReferenceGatewayConfig } from "./types";

export interface ConfigValidationInput {
  partnerId: string;
  policyId: string;
  abraxasPublicReceiptBaseUrl: string;
  facilitatorUrl: string;
  payTo: string;
  resourceUrl: string;
  priceAmount: string;
  priceAssetCaip19: string;
  network: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isOfficialBaseSepoliaUsdcCaip19(value: string): boolean {
  return value.toLowerCase() === BASE_SEPOLIA_USDC_CAIP19.toLowerCase();
}

export function validateReferenceGatewayConfigInput(
  input: ConfigValidationInput,
): ConfigValidationResult {
  const errors: string[] = [];

  if (!input.partnerId.trim()) errors.push("partner_id_required");
  if (!input.policyId.trim()) errors.push("policy_id_required");

  if (!isHttpsUrl(input.abraxasPublicReceiptBaseUrl)) {
    errors.push("abraxas_base_url_must_be_https");
  }
  if (!isHttpsUrl(input.facilitatorUrl)) {
    errors.push("facilitator_url_must_be_https");
  }
  if (!isHttpsUrl(input.resourceUrl)) {
    errors.push("resource_url_must_be_https");
  }

  if (input.network !== BASE_SEPOLIA_CAIP2) {
    errors.push("network_must_be_base_sepolia");
  }

  if (!isEvmAddress(input.payTo)) {
    errors.push("pay_to_must_be_valid_evm_address");
  }

  if (!isPositiveAtomicAmount(input.priceAmount)) {
    errors.push("price_amount_must_be_positive_atomic_units");
  }

  if (!isOfficialBaseSepoliaUsdcCaip19(input.priceAssetCaip19)) {
    errors.push("price_asset_must_be_official_base_sepolia_usdc_caip19");
  }

  return { valid: errors.length === 0, errors };
}

export function validateResolvedReferenceGatewayConfig(
  config: ReferenceGatewayConfig,
): ConfigValidationResult {
  return validateReferenceGatewayConfigInput({
    partnerId: config.partnerId,
    policyId: config.policyId,
    abraxasPublicReceiptBaseUrl: config.abraxasPublicReceiptBaseUrl,
    facilitatorUrl: config.facilitatorUrl,
    payTo: config.payTo,
    resourceUrl: config.resourceUrl,
    priceAmount: config.priceAmount,
    priceAssetCaip19: config.priceAssetCaip19,
    network: config.network,
  });
}
