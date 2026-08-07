// FILE: lib/x402/referenceGateway/constants.ts
// Testnet-only x402 v2 constants for the reference partner gateway.

export const X402_PROTOCOL_VERSION = 2 as const;

/** Base Sepolia — sole supported network for this reference integration. */
export const BASE_SEPOLIA_CAIP2 = "eip155:84532" as const;

/** Official Base Sepolia USDC (Circle) — ERC-20 address used in x402 v2 wire payloads. */
export const BASE_SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

/** Official Base Sepolia USDC CAIP-19 identifier for operator config validation. */
export const BASE_SEPOLIA_USDC_CAIP19 =
  `eip155:84532/erc20:${BASE_SEPOLIA_USDC_ADDRESS}` as const;

export const X402_HEADER_PAYMENT_REQUIRED = "PAYMENT-REQUIRED";
export const X402_HEADER_PAYMENT_SIGNATURE = "PAYMENT-SIGNATURE";
export const X402_HEADER_PAYMENT_RESPONSE = "PAYMENT-RESPONSE";

export const REFERENCE_GATEWAY_LABEL =
  "TESTNET / DEMO ONLY — x402 + Abraxas Partner Flow reference gateway. Not production.";

export const REFERENCE_GATEWAY_RESOURCE_ID = "synthetic-protected-resource";
