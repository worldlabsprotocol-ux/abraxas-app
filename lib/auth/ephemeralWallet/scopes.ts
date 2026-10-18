// FILE: lib/auth/ephemeralWallet/scopes.ts

export const EPHEMERAL_WALLET_SCOPES = [
  "wallet:session",
  "sandbox:enter",
  "sandbox:application:create",
  "sandbox:verification:test",
  "account:read",
] as const;

export type EphemeralWalletScope = (typeof EPHEMERAL_WALLET_SCOPES)[number];

/** Minimal capability after sign-in — no sandbox or verification authority. */
export function signInEphemeralWalletScopes(): EphemeralWalletScope[] {
  return ["wallet:session", "account:read"];
}

export function defaultEphemeralWalletScopes(): EphemeralWalletScope[] {
  return signInEphemeralWalletScopes();
}

export function hasEphemeralScope(scopes: string[], required: EphemeralWalletScope): boolean {
  return scopes.includes(required);
}
