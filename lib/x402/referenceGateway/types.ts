// FILE: lib/x402/referenceGateway/types.ts
// Abraxas reference gateway types — x402 wire types come from @x402/core.

import type {
  PaymentPayload,
  PaymentRequired,
  SettleResponse,
} from "@x402/core/types";
import type { BASE_SEPOLIA_CAIP2 } from "./constants";

export type { PaymentPayload, PaymentRequired, PaymentRequirements, SettleResponse, ResourceInfo } from "@x402/core/types";

/** @deprecated Use SettleResponse from @x402/core/types */
export type SettlementResponse = SettleResponse;

export type SupportedNetwork = typeof BASE_SEPOLIA_CAIP2;

export type FulfillmentStatus = "pending" | "settled" | "failed" | "ambiguous";

export interface FulfillmentRecord {
  idempotency_key: string;
  receipt_id: string;
  payment_payload_hash: string;
  settlement_ref: string | null;
  status: FulfillmentStatus;
  access_grant_expires_at: string;
  created_at: string;
  payment_response: SettleResponse;
}

export interface ReferenceGatewayConfig {
  partnerId: string;
  policyId: string;
  abraxasPublicReceiptBaseUrl: string;
  resourceUrl: string;
  resourceId: string;
  priceAmount: string;
  /** CAIP-19 asset identifier — validated at startup; wire format uses ERC-20 address via SDK. */
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
