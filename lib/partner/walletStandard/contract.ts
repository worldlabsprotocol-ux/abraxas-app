// FILE: lib/partner/walletStandard/contract.ts
// Optional Wallet Standard binding. Not identity. Not a wallet product.

export const WALLET_STANDARD_BINDING_VERSION = "1.0.0" as const;

export const WALLET_STANDARD_PURPOSE = "bind_wallet_to_action_contract" as const;

export const WALLET_STANDARD_BINDING_MODES = ["not_attached", "optional", "required"] as const;
export type WalletStandardBindingMode = (typeof WALLET_STANDARD_BINDING_MODES)[number];

export const WALLET_STANDARD_SAFE_REASONS = [
  "bound",
  "optional_unused",
  "not_attached",
  "missing",
  "expired",
  "mismatched",
  "replayed",
  "cross_partner",
  "wrong_origin",
  "invalid_signature",
  "invalid",
] as const;
export type WalletStandardSafeReason = (typeof WALLET_STANDARD_SAFE_REASONS)[number];

export const WALLET_STANDARD_CLIENT_VISIBLE_KEYS = [
  "ok",
  "status",
  "binding_ref",
  "expires_at",
] as const;

export const WALLET_STANDARD_NOT_IDENTITY =
  "Wallet binding proves control of a self-custodial wallet for one action contract. It is not identity verification and does not reveal private wallet information.";

export const WALLET_STANDARD_NO_WALLET_PRODUCT =
  "Connection is optional. Passport, Partner Flow, and receipt verification work with no wallet connected. Abraxas never generates a transaction, reads balances, or holds keys.";

export const WALLET_STANDARD_CONNECTOR_NOTICE =
  "Use Wallet Standard signMessage. Phantom is supported through that standard. Do not request transaction signing or extra wallet permissions.";

export interface WalletStandardChallengeView {
  challenge_id: string;
  message: string;
  expires_at: string;
  purpose: typeof WALLET_STANDARD_PURPOSE;
}

export interface WalletStandardBindView {
  ok: boolean;
  status: WalletStandardSafeReason;
  binding_ref: string | null;
  expires_at: string | null;
}
