// FILE: lib/settlement/types.ts
// Chain independent settlement authorization types.

import type { ArcEnvironment } from "@/lib/settlement/constants";

export type SettlementEnvironment = "sandbox" | "production";
export type SettlementAmountKind = "exact" | "max";
export type SettlementAuthorizationStatus =
  | "requested"
  | "issued"
  | "rejected"
  | "submitted"
  | "confirmed"
  | "failed"
  | "expired"
  | "replayed";

export type SettlementActivityEventType =
  | "arc_authorization_requested"
  | "arc_authorization_issued"
  | "arc_authorization_rejected"
  | "arc_transaction_submitted"
  | "arc_transaction_confirmed"
  | "arc_transaction_failed"
  | "arc_authorization_expired"
  | "arc_authorization_replayed"
  | "arc_settlement_paused";

export interface SettlementAuthorizationPayload {
  chainId: bigint;
  environment: SettlementEnvironment;
  partnerApplicationId: `0x${string}`;
  partnerIdHash: `0x${string}`;
  policyIdHash: `0x${string}`;
  policyVersion: bigint;
  eligibleWallet: `0x${string}`;
  recipient: `0x${string}`;
  token: `0x${string}`;
  amountMicroUsdc: bigint;
  amountKind: SettlementAmountKind;
  actionType: `0x${string}`;
  nonce: `0x${string}`;
  issuedAt: bigint;
  expiresAt: bigint;
  receiptCommitment: `0x${string}`;
  settlementReference: `0x${string}`;
}

export interface SettlementTypedDataBundle {
  domain: {
    name: string;
    version: string;
    chainId: bigint | number;
    verifyingContract: `0x${string}`;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, unknown>;
}

export interface SignedSettlementAuthorization {
  authorizationId: string;
  payload: SettlementAuthorizationPayload;
  signature: `0x${string}`;
  signerAddress: `0x${string}`;
  typedData: SettlementTypedDataBundle;
  expiresAtIso: string;
  settlementReference: string;
}

export interface ArcSettlementConfigRow {
  id: string;
  application_id: string;
  partner_id: string;
  enabled: boolean;
  arc_environment: ArcEnvironment;
  chain_id: number;
  settlement_contract_address: string | null;
  usdc_token_address: string;
  approved_recipient: string;
  minimum_amount_micro_usdc: number;
  maximum_amount_micro_usdc: number;
  policy_id: string;
  policy_version: number;
  authorization_lifetime_seconds: number;
  reusable_authorization: boolean;
  paused: boolean;
  created_at: string;
  updated_at: string;
}

export interface ArcAuthorizationRow {
  id: string;
  application_id: string;
  partner_id: string;
  environment: SettlementEnvironment;
  chain_id: number;
  eligible_wallet: string;
  recipient: string;
  token_address: string;
  amount_micro_usdc: number;
  amount_kind: SettlementAmountKind;
  action_type: string;
  nonce: string;
  receipt_id: string;
  receipt_commitment: string;
  settlement_reference: string;
  policy_id: string;
  policy_version: number;
  status: SettlementAuthorizationStatus;
  issued_at: string;
  expires_at: string;
  confirmed_at: string | null;
  transaction_hash: string | null;
  block_number: number | null;
  failure_code: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PrepareSettlementAuthorizationInput {
  applicationId: string;
  partnerId: string;
  receiptId: string;
  eligibleWallet?: string;
  amountMicroUsdc: bigint;
  environment: SettlementEnvironment;
  settlementReference?: string;
  subjectId?: string;
  idempotencyKey?: string;
}

export interface RecordSettlementConfirmationInput {
  applicationId: string;
  partnerId: string;
  authorizationId: string;
  transactionHash: string;
}

