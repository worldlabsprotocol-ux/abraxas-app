// FILE: lib/partner/evmWalletBinding/contract.ts
// Optional EVM wallet-control proof for one Portable Action Contract. Not login or custody.

export const EVM_WALLET_BINDING_VERSION = "1.0.0" as const;
export const EVM_WALLET_BINDING_PURPOSE = "bind_evm_wallet_to_action_contract" as const;
export const EVM_WALLET_SIGNING_STANDARD = "eip191_personal_sign" as const;
export const EVM_WALLET_SIGNING_LIBRARY = "viem.verifyMessage / viem.recoverMessageAddress" as const;

export const EVM_WALLET_BINDING_MODES = ["not_attached", "optional", "required"] as const;
export type EvmWalletBindingMode = (typeof EVM_WALLET_BINDING_MODES)[number];

export const EVM_WALLET_SAFE_REASONS = [
  "bound",
  "optional_unused",
  "not_attached",
  "missing",
  "expired",
  "revoked",
  "mismatched",
  "replayed",
  "cross_partner",
  "wrong_origin",
  "invalid_signature",
  "invalid",
  "store_unavailable",
] as const;
export type EvmWalletSafeReason = (typeof EVM_WALLET_SAFE_REASONS)[number];

export const EVM_WALLET_CLIENT_VISIBLE_KEYS = [
  "ok",
  "status",
  "binding_ref",
  "expires_at",
] as const;

export const EVM_WALLET_CHALLENGE_CLIENT_KEYS = [
  "challenge_id",
  "message",
  "expires_at",
  "purpose",
] as const;

export const EVM_WALLET_REJECTED_CLIENT_KEYS = [
  "partner_id",
  "policy_id",
  "policy_version",
  "action_type",
  "action_scope",
  "network_id",
  "chain_id",
  "wallet",
  "wallet_address",
  "address",
  "public_key",
  "signature_valid",
  "receipt",
  "receipt_id",
  "api_key",
  "activate_production",
  "production",
  "mainnet",
  "rpc",
  "rpc_url",
  "transaction",
  "tx",
  "balance",
  "private_key",
  "challenge_authority",
  "binding_status",
] as const;

export const EVM_WALLET_NOT_IDENTITY =
  "This proves control of a self-custodial EVM address for one named action. It is not login, KYC, identity verification, wallet custody, a portfolio read, a balance check, token-gating, transaction approval, or a generic wallet-connect product.";

export const EVM_WALLET_NO_TRANSACTION =
  "Sign this message to prove control for this one action. No transaction will be created or signed. Abraxas does not read your balances or hold your keys.";

export const EVM_WALLET_MESSAGE_PROOF_ONLY =
  "This is a message proof only, no transaction.";

export interface EvmWalletChallengeView {
  challenge_id: string;
  message: string;
  expires_at: string;
  purpose: typeof EVM_WALLET_BINDING_PURPOSE;
}

export interface EvmWalletBindView {
  ok: boolean;
  status: EvmWalletSafeReason;
  binding_ref: string | null;
  expires_at: string | null;
}
