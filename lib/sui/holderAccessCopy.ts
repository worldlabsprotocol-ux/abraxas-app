// FILE: lib/sui/holderAccessCopy.ts
// Plain-language holder access boundaries (wallet vs Passport vs partner).

export const HOLDER_WALLET_PRIMARY_LABEL = "Connect Sui wallet";
export const HOLDER_WALLET_CONNECTING = "Opening wallet…";
export const HOLDER_WALLET_DISCONNECT = "Disconnect wallet";
export const HOLDER_WALLET_BOUNDARY =
  "A connected wallet proves control of an address. It does not verify your identity or eligibility.";
export const HOLDER_WALLET_NO_EXTENSION =
  "Install a Sui wallet extension (for example Slush or Sui Wallet), then refresh this page.";
export const HOLDER_PASSPORT_ACCOUNT_HEADING = "Passport account";
export const HOLDER_LEGACY_GOOGLE_LABEL = "Continue with Google";
export const HOLDER_LEGACY_GOOGLE_DETAIL =
  "For Passports created before wallet connect. Opens your existing Abraxas account. Not eligibility proof.";
export const HOLDER_WALLET_SESSION_MISMATCH =
  "Your connected wallet does not match this Passport account. Disconnect or sign in with the account that owns this Passport.";
