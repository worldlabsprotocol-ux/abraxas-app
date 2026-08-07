// FILE: lib/x402/referenceGateway/configValidation.ts
// Startup validation for operator-supplied reference gateway configuration.

import {
  BASE_SEPOLIA_CAIP2,
  BASE_SEPOLIA_USDC_ADDRESS,
  BASE_SEPOLIA_USDC_CAIP19,
} from "./constants";
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

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function isEvmAddress(value: string): boolean {
  return EVM_ADDRESS_RE.test(value);
}

export function isPositiveAtomicAmount(value: string): boolean {
  if (!/^\d+$/.test(value)) return false;
  try {
    return BigInt(value) > BigInt(0);
  } catch {
    return false;
  }
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

/** Map validated CAIP-19 config asset to ERC-20 address for x402 SDK price parsing. */
export function wireAssetAddressFromCaip19(caip19: string): string {
  const match = caip19.match(/^eip155:\d+\/erc20:(0x[0-9a-fA-F]{40})$/i);
  if (!match?.[1]) {
    throw new Error("invalid_caip19_asset");
  }
  if (match[1].toLowerCase() !== BASE_SEPOLIA_USDC_ADDRESS.toLowerCase()) {
    throw new Error("invalid_caip19_asset");
  }
  return match[1];
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
