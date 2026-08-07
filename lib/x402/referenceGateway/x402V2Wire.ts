// FILE: lib/x402/referenceGateway/x402V2Wire.ts
// Validators and helpers for official x402 v2 wire payloads.

import {
  BASE_SEPOLIA_CAIP2,
  BASE_SEPOLIA_USDC_ADDRESS,
  X402_PROTOCOL_VERSION,
} from "./constants";
import type {
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  SettlementResponse,
} from "./types";

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

export function isPaymentRequirements(value: unknown): value is PaymentRequirements {
  if (!value || typeof value !== "object") return false;
  const req = value as PaymentRequirements;
  return (
    req.scheme === "exact"
    && req.network === BASE_SEPOLIA_CAIP2
    && typeof req.amount === "string"
    && isPositiveAtomicAmount(req.amount)
    && typeof req.asset === "string"
    && isEvmAddress(req.asset)
    && typeof req.payTo === "string"
    && isEvmAddress(req.payTo)
    && typeof req.maxTimeoutSeconds === "number"
    && req.maxTimeoutSeconds > 0
  );
}

export function isPaymentRequired(value: unknown): value is PaymentRequired {
  if (!value || typeof value !== "object") return false;
  const required = value as PaymentRequired;
  return (
    required.x402Version === X402_PROTOCOL_VERSION
    && typeof required.resource === "object"
    && required.resource !== null
    && typeof required.resource.url === "string"
    && Array.isArray(required.accepts)
    && required.accepts.length > 0
    && required.accepts.every(isPaymentRequirements)
  );
}

export function isPaymentPayload(value: unknown): value is PaymentPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as PaymentPayload;
  if (payload.x402Version !== X402_PROTOCOL_VERSION) return false;
  if (!isPaymentRequirements(payload.accepted)) return false;
  const inner = payload.payload;
  if (!inner || typeof inner !== "object") return false;
  if (typeof inner.signature !== "string" || !inner.signature.startsWith("0x")) return false;
  const auth = inner.authorization;
  if (!auth || typeof auth !== "object") return false;
  return (
    isEvmAddress(auth.from)
    && isEvmAddress(auth.to)
    && typeof auth.value === "string"
    && typeof auth.validAfter === "string"
    && typeof auth.validBefore === "string"
    && typeof auth.nonce === "string"
  );
}

export function isSettlementResponse(value: unknown): value is SettlementResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as SettlementResponse;
  return (
    typeof response.success === "boolean"
    && typeof response.transaction === "string"
    && response.network === BASE_SEPOLIA_CAIP2
  );
}

/** Map validated CAIP-19 config asset to ERC-20 address for x402 v2 wire format. */
export function wireAssetAddressFromCaip19(caip19: string): string {
  const match = caip19.match(/^eip155:\d+\/erc20:(0x[0-9a-fA-F]{40})$/);
  if (!match?.[1]) {
    throw new Error("invalid_caip19_asset");
  }
  return match[1];
}

export function baseSepoliaUsdcWireRequirements(
  overrides: Partial<PaymentRequirements> & Pick<PaymentRequirements, "amount" | "payTo">,
): PaymentRequirements {
  return {
    scheme: "exact",
    network: BASE_SEPOLIA_CAIP2,
    asset: BASE_SEPOLIA_USDC_ADDRESS,
    maxTimeoutSeconds: 300,
    extra: { name: "USDC", version: "2" },
    ...overrides,
  };
}

export function primaryPaymentRequirements(required: PaymentRequired): PaymentRequirements {
  return required.accepts[0]!;
}

export function buildFailedSettlementResponse(errorReason: string): SettlementResponse {
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
): SettlementResponse {
  return {
    success: true,
    transaction,
    network: BASE_SEPOLIA_CAIP2,
    ...(payer ? { payer } : {}),
  };
}
