// FILE: lib/x402/referenceGateway/types.ts
// x402 v2 HTTP transport types (reference gateway subset).

import type { BASE_SEPOLIA_CAIP2 } from "./constants";

export type SupportedNetwork = typeof BASE_SEPOLIA_CAIP2;

export interface PaymentAcceptV2 {
  scheme: "exact";
  network: SupportedNetwork;
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
}

export interface PaymentRequiredV2 {
  x402Version: 2;
  accepts: PaymentAcceptV2[];
}

export interface PaymentPayloadV2 {
  x402Version: 2;
  scheme: "exact";
  network: SupportedNetwork;
  payload: Record<string, unknown>;
}

export interface SettlementResponseV2 {
  x402Version: 2;
  success: boolean;
  settlementRef?: string;
  error?: string;
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
  payment_response: SettlementResponseV2;
}

export interface ReferenceGatewayConfig {
  partnerId: string;
  policyId: string;
  abraxasPublicReceiptBaseUrl: string;
  resourceUrl: string;
  resourceId: string;
  priceAmount: string;
  priceAsset: string;
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
