// FILE: lib/auth/ephemeralWallet/walletMessageSafetyCopy.ts
// Shared copy for message-only wallet signatures (not on-chain transactions).

export const WALLET_MESSAGE_ONLY_FUNDS_LINES = [
  "No funds will move.",
  "No spending permission is requested.",
  "This signature does not authorize a transaction.",
] as const;
