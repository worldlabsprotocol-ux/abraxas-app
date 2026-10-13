// FILE: lib/auth/passportWalletAuth/contract.ts

export const PASSPORT_WALLET_PROVIDER = "passport_wallet" as const;

export const PASSPORT_WALLET_AUTH_COOKIE = "abx_passport_wallet_auth_ctx";

export const PASSPORT_WALLET_ACTIONS = {
  passportSignIn: "passport_sign_in",
  partnerVerify: "partner_verify",
  linkLegacyWallet: "link_legacy_wallet",
} as const;

export type PassportWalletIntendedAction =
  (typeof PASSPORT_WALLET_ACTIONS)[keyof typeof PASSPORT_WALLET_ACTIONS];

export const PASSPORT_WALLET_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export interface PassportWalletChallengeView {
  challenge_id: string;
  message: string;
  expires_at: string;
  wallet_address: string;
  sui_network: string;
  intended_action: PassportWalletIntendedAction;
}

export interface PassportWalletAuthSuccess {
  ok: true;
  holder_subject_id: string;
  sui_address?: string;
  wallet_caip10: string;
  provider: typeof PASSPORT_WALLET_PROVIDER;
  session_kind: "wallet";
  created_identity: boolean;
}

export type PassportWalletAuthFailureCode =
  | "invalid_input"
  | "wrong_origin"
  | "wrong_network"
  | "network_config_invalid"
  | "wrong_wallet"
  | "wrong_domain"
  | "expired"
  | "replay"
  | "invalid_signature"
  | "wrong_action"
  | "store_unavailable"
  | "legacy_link_required"
  | "wallet_bound_to_other_subject"
  | "session_context_mismatch"
  | "unauthorized";
