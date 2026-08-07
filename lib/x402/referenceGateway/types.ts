// FILE: lib/x402/referenceGateway/types.ts
// x402 v2 core types aligned with the official specification (transport-agnostic).

import type { BASE_SEPOLIA_CAIP2 } from "./constants";

export type SupportedNetwork = typeof BASE_SEPOLIA_CAIP2;

export interface ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
  serviceName?: string;
  tags?: string[];
  iconUrl?: string;
}

/** PaymentRequirements — one accepted payment method in PaymentRequired.accepts[]. */
export interface PaymentRequirements {
  scheme: "exact";
  network: SupportedNetwork;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: {
    name?: string;
    version?: string;
    [key: string]: unknown;
  };
}

/** PaymentRequired — carried in PAYMENT-REQUIRED (HTTP base64 JSON). */
export interface PaymentRequired {
  x402Version: 2;
  error?: string;
  resource: ResourceInfo;
  accepts: PaymentRequirements[];
  extensions?: Record<string, unknown>;
}

/** PaymentPayload — carried in PAYMENT-SIGNATURE (HTTP base64 JSON). */
export interface PaymentPayload {
  x402Version: 2;
  resource?: ResourceInfo;
  accepted: PaymentRequirements;
  payload: {
    signature: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
  extensions?: Record<string, unknown>;
}

/** SettlementResponse — carried in PAYMENT-RESPONSE (HTTP base64 JSON). */
export interface SettlementResponse {
  success: boolean;
  errorReason?: string;
  payer?: string;
  transaction: string;
  network: SupportedNetwork;
  amount?: string;
  extensions?: Record<string, unknown>;
}

export type FulfillmentStatus = "pending" | "settled" | "failed" | "ambiguous";

export interface FulfillmentRecord {
  idempotency_key: string;
  receipt_id: string;
  payment_payload_hash: string;
  settlement_ref: string | null;
  status: FulfillmentStatus;
  access_grant_expires_at: string;
  created_at: string;
  payment_response: SettlementResponse;
}

export interface ReferenceGatewayConfig {
  partnerId: string;
  policyId: string;
  abraxasPublicReceiptBaseUrl: string;
  resourceUrl: string;
  resourceId: string;
  priceAmount: string;
  /** CAIP-19 asset identifier — validated at startup; wire format uses ERC-20 address. */
  priceAssetCaip19: string;
  network: SupportedNetwork;
  payTo: string;
  facilitatorUrl: string;
  accessGrantTtlSec: number;
  /** Required true for testnet demo — production integrations must be false. */
  allowSandbox: boolean;
}

export interface GatewayResponseBody {
  demo_label: string;
  resource_id?: string;
  receipt_id?: string;
  message?: string;
  code?: string;
}

export interface GatewayResult {
  status: number;
  headers: Record<string, string>;
  body: GatewayResponseBody;
}
