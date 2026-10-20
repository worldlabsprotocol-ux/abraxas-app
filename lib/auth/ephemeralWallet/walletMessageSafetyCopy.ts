// FILE: lib/auth/ephemeralWallet/walletMessageSafetyCopy.ts
// Copy for message-only wallet signatures (not on-chain transactions).

/** Wallet sign-in only — control proof, not a scoped authorization. */
export const WALLET_SIGN_IN_FUNDS_LINES = [
  "No funds will move.",
  "No spending permission is requested.",
  "This signature does not authorize a transaction.",
] as const;

/** @deprecated Use WALLET_SIGN_IN_FUNDS_LINES */
export const WALLET_MESSAGE_ONLY_FUNDS_LINES = WALLET_SIGN_IN_FUNDS_LINES;

/** Scoped message signatures — financial safety without implying the action has no consequences. */
export const WALLET_SCOPED_FINANCIAL_SAFETY_LINES = [
  "No SOL transfer or token spending approval is requested by this message.",
] as const;
