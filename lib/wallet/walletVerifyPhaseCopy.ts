// FILE: lib/wallet/walletVerifyPhaseCopy.ts

import type { WalletVerifyPhase } from "./walletVerifyFlowTypes";

export function walletVerifyPhaseIcon(phase: WalletVerifyPhase): { glyph: string; color: string } {
  switch (phase) {
    case "verified":
      return { glyph: "✓", color: "#14F195" };
    case "error":
      return { glyph: "!", color: "#E8A020" };
    case "connecting":
    case "awaiting_signature":
    case "verifying":
      return { glyph: "…", color: "var(--text-secondary)" };
    default:
      return { glyph: "◎", color: "#14F195" };
  }
}

export function walletVerifyPhaseHeadline(phase: WalletVerifyPhase, walletLabel: string | null): string {
  switch (phase) {
    case "choose_wallet":
      return "Verify wallet control";
    case "connecting":
      return `Connecting ${walletLabel ?? "wallet"}…`;
    case "awaiting_signature":
      return "Review signature in your wallet";
    case "verifying":
      return "Verifying signature…";
    case "verified":
      return "Wallet verified";
    case "error":
      return "Wallet verification could not complete";
    default:
      return "Verify wallet control";
  }
}

export function walletVerifyPhaseDetail(phase: WalletVerifyPhase, walletLabel: string | null): string {
  switch (phase) {
    case "choose_wallet":
      return "Connect a wallet to approve this verification request.";
    case "connecting":
      return "Approve the connection request in your wallet extension. Connecting alone does not prove wallet control.";
    case "awaiting_signature":
      return walletLabel
        ? `When ${walletLabel} is open, approve the message signature. It does not move funds or grant spending permission.`
        : "Approve the message signature in your wallet. It does not move funds.";
    case "verifying":
      return "Confirming your signature with Abraxas before sharing any partner result.";
    case "verified":
      return "Wallet control confirmed for this session. Continuing to partner authorization…";
    case "error":
      return "You can cancel, choose another wallet, or try signing again without refreshing this page.";
    default:
      return "";
  }
}
