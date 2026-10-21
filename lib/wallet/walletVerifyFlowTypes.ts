// FILE: lib/wallet/walletVerifyFlowTypes.ts

export type WalletVerifyChoice = "phantom" | "metamask";

export type WalletVerifyPhase =
  | "choose_wallet"
  | "connecting"
  | "awaiting_signature"
  | "verifying"
  | "verified"
  | "error";
