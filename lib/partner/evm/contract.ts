// FILE: lib/partner/evm/contract.ts
// EVM partner eligibility adapter. Preflight only. Partner retains execution.

import { PARTNER_INTEGRATION_GOOGLE_BOUNDARY } from "@/lib/partner/integrationKit/contract";
import { PARTNER_EVENT_NOT_AUTHORIZATION } from "@/lib/partner/eventDelivery/contract";
import type { PortableActionContract } from "@/lib/partner/portableActionContract/contract";

export const EVM_PARTNER_ADAPTER_VERSION = "1.0.0" as const;

export const EVM_PARTNER_ACTION_TYPES = [
  "enable_protocol_access",
  "enable_member_access",
  "enable_redemption_access",
] as const;
export type EvmPartnerActionType = (typeof EVM_PARTNER_ACTION_TYPES)[number];

export const EVM_PROTOCOL_SCOPE = "sandbox:protocol_access" as const;
export const EVM_MEMBER_SCOPE = "sandbox:member_access" as const;
export const EVM_REDEMPTION_SCOPE = "sandbox:redemption_access" as const;
export const EVM_PARTNER_ALLOWED_SCOPES = [
  EVM_PROTOCOL_SCOPE,
  EVM_MEMBER_SCOPE,
  EVM_REDEMPTION_SCOPE,
] as const;
export type EvmPartnerActionScope = (typeof EVM_PARTNER_ALLOWED_SCOPES)[number];

export const EVM_PARTNER_TYPE_SCOPES: Record<EvmPartnerActionType, EvmPartnerActionScope> = {
  enable_protocol_access: EVM_PROTOCOL_SCOPE,
  enable_member_access: EVM_MEMBER_SCOPE,
  enable_redemption_access: EVM_REDEMPTION_SCOPE,
};

export const EVM_PARTNER_CLIENT_VISIBLE_KEYS = [
  "allowed",
  "reason",
  "action_binding",
  "expires_at",
] as const;

export const EVM_PARTNER_FORBIDDEN_CLIENT_KEYS = [
  "receipt",
  "receipt_id",
  "signature",
  "signature_valid",
  "wallet",
  "wallet_address",
  "email",
  "legal_name",
  "date_of_birth",
  "dob",
  "profile",
  "claims",
  "evaluated_claim_refs",
  "jwt",
  "id_token",
  "rpc",
  "rpc_url",
  "chain_id",
  "calldata",
  "transaction",
  "tx",
  "private_key",
  "gas",
] as const;

export const EVM_CLIENT_OVERRIDE_KEYS = [
  "chain_id",
  "chainId",
  "rpc",
  "rpc_url",
  "wallet",
  "wallet_address",
  "wallet_id",
  "transaction",
  "tx",
  "execute",
  "execution",
  "provider",
  "calldata",
  "data",
  "to",
  "recipient",
  "amount",
  "token",
  "method",
  "contract_address",
  "gas",
  "value",
  "private_key",
  "activate_production",
  "issue_production_key",
  "mainnet",
] as const;

export const EVM_NOT_A_CHAIN_PRODUCT =
  "Abraxas is the private eligibility layer for one named partner protocol action. It is not a wallet, exchange, custodian, token issuer, transaction relay, smart contract, browser wallet, or on-chain identity registry.";

export const EVM_NO_EXECUTION_BOUNDARY =
  "Allowed is never a transaction approval, signature, gas authorization, transfer, or execution. The partner backend retains its own RPC, signer, contract, gas, transaction construction, and execution.";

export const EVM_WALLET_BINDING_OUT_OF_SCOPE =
  "Optional EVM wallet-control proves message-signed control for one named action. It is not Solana Wallet Standard, login, KYC, custody, a balance read, or transaction signing. Client wallet fields remain rejected.";

export const EVM_PRIVACY_CONTRACT = [
  PARTNER_INTEGRATION_GOOGLE_BOUNDARY,
  PARTNER_EVENT_NOT_AUTHORIZATION,
  EVM_NO_EXECUTION_BOUNDARY,
  "Partners receive only allow or deny, a safe reason code, action binding, and expiry.",
  "Browser responses must not include receipts, signatures, claims, PII, wallets, RPC URLs, calldata, or transaction payloads.",
] as const;

export const EVM_VERIFICATION_REUSE =
  "Receipt verification is AbraxasPartnerKit plus GET /api/receipts/{id}/public. This adapter does not implement a second verifier.";

export const EVM_FLOW =
  "Policy pack → hosted Partner Flow → minimum approved receipt → EVM preflight for one named action → partner-owned execution. A webhook body is never a grant.";

export interface EvmPartnerActionContract extends Omit<
  PortableActionContract,
  "action_type" | "action_scope" | "wallet_binding" | "receipt_requirement" | "issued_at" | "environment"
> {
  action_type: EvmPartnerActionType;
  action_scope: EvmPartnerActionScope;
  wallet_binding?: PortableActionContract["wallet_binding"];
  receipt_requirement?: PortableActionContract["receipt_requirement"];
  issued_at?: string;
  environment?: PortableActionContract["environment"];
}

export interface EvmPartnerActionBinding {
  action_type: EvmPartnerActionType | "rejected";
  action_scope: string;
  nonce_state: "issued" | "consumed" | "replayed" | "rejected";
  wallet_binding: PortableActionContract["wallet_binding"] | "bound" | "missing" | "expired" | "mismatched" | "replayed" | "cross_partner" | "unsupported";
}

export const EVM_LIVE_INTEGRATION_REQUIREMENTS = [
  "The partner remains the execution system. Abraxas only answers a preflight for one named protocol action.",
  "An allowed result is not a transaction approval, signature, gas authorization, transfer, or on-chain execution.",
  "Production access stays on the reviewed Launchpad upgrade path. No self-serve live keys from this adapter.",
  "Pin partner_id, policy_id, and policy_version. Fail closed on draft, deprecated, missing, or mismatched versions.",
  "Issue a server-authoritative action contract (type, narrow scope, expiry, one-time nonce) before each grant.",
  "Verify the current public receipt on the server. Do not trust callbacks, webhooks, or client flags.",
  "Consume the durable nonce on the first permitted preflight. Replay the same nonce as deny.",
  "Return only allow or deny, a safe reason, action binding, and expiry. Never return receipt, RPC, wallet, or transaction material.",
  "Reject arbitrary contract methods, calldata, chain IDs, recipient addresses, token amounts, transaction payloads, and wallet fields.",
  "EVM Mainnet stays unavailable until reviewed Production access, a supported action, a current receipt, durable replay, and a partner-owned EVM execution integration exist.",
  "Do not claim any specific EVM chain, RPC, wallet, protocol, or Mainnet deployment is live.",
  "Optional EVM wallet-control is an EIP-191 personal_sign proof for one action. It is not login, KYC, custody, a balance read, or transaction approval.",
] as const;
