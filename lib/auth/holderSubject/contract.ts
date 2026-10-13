// FILE: lib/auth/holderSubject/contract.ts

export const HOLDER_SUBJECT_PREFIX = "abx_hs_" as const;

export const HOLDER_AUTH_ACTIONS = {
  passportSignIn: "passport_sign_in",
  partnerVerify: "partner_verify",
  linkLegacyWallet: "link_legacy_wallet",
} as const;

export type HolderAuthIntendedAction =
  (typeof HOLDER_AUTH_ACTIONS)[keyof typeof HOLDER_AUTH_ACTIONS];

export const HOLDER_AUTH_CONTEXT_COOKIE = "abx_holder_auth_ctx";
export const HOLDER_AUTH_CHALLENGE_TTL_MS = 5 * 60 * 1000;
