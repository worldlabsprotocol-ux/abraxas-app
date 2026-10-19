// FILE: lib/nav/solanaSignInDialogState.ts
// Pure UI state for public Solana wallet sign-in (connection ≠ authentication).

export type SolanaSignInPhase =
  | "idle"
  | "connecting"
  | "connected"
  | "signing"
  | "verifying"
  | "success"
  | "failure";

export type SolanaSignInStepId = "connect" | "review" | "sign" | "enter";

export const SOLANA_SIGN_IN_STEPS: { id: SolanaSignInStepId; label: string }[] = [
  { id: "connect", label: "Connect wallet" },
  { id: "review", label: "Review request" },
  { id: "sign", label: "Sign message" },
  { id: "enter", label: "Enter Abraxas" },
];

export function activeSignInStepIndex(input: {
  phase: SolanaSignInPhase;
  walletConnected: boolean;
}): number {
  if (input.phase === "success") return 3;
  if (input.phase === "verifying") return 3;
  if (input.phase === "signing") return 2;
  if (input.walletConnected || input.phase === "connected") return 1;
  if (input.phase === "connecting") return 0;
  return 0;
}

export function signInModalTitle(input: {
  phase: SolanaSignInPhase;
  walletConnected: boolean;
}): string {
  if (input.phase === "success") return "Wallet confirmed";
  if (input.phase === "failure") return "Could not sign in";
  if (input.phase === "signing" || input.phase === "verifying") return "Sign in with your wallet";
  if (input.walletConnected) return "Sign in with your wallet";
  return "Connect your wallet";
}

export function signInStatusMessage(input: {
  phase: SolanaSignInPhase;
  walletName: string | null;
}): string | null {
  const { walletName } = input;
  switch (input.phase) {
    case "connecting":
      return walletName ? `Opening ${walletName}…` : "Opening wallet…";
    case "signing":
      return walletName
        ? `Review the message in ${walletName}…`
        : "Waiting for signature…";
    case "verifying":
      return "Verifying signature…";
    case "success":
      return "Entering Abraxas…";
    default:
      return null;
  }
}

export function mapWalletConnectFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  if (lower.includes("rejected") || lower.includes("user rejected") || lower.includes("cancel")) {
    return "Connection request dismissed. Choose a wallet and try again.";
  }
  if (lower.includes("not found") || lower.includes("not detected")) {
    return "Wallet not detected. Install the extension or choose another wallet.";
  }
  if (lower.includes("blocked") || lower.includes("popup")) {
    return "Wallet popup may be blocked. Allow popups for this site and try again.";
  }
  return "Could not connect wallet. Try again or choose another wallet.";
}

export function mapSignInFailure(input: {
  reason: "cancelled" | "failed";
  code?: string;
  message?: string;
}): string {
  if (input.reason === "cancelled") {
    return "Signature request dismissed. Click Sign message when you are ready.";
  }
  if (input.code === "expired") return "Sign-in request timed out. Try again.";
  if (input.message) return input.message;
  return "Could not verify signature. Try again.";
}

export type WalletOptionView = {
  name: string;
  label: string;
  installed: boolean;
  installUrl: string;
};

export const WALLET_INSTALL_URLS: Record<string, string> = {
  Phantom: "https://phantom.app/download",
  Solflare: "https://solflare.com/download",
};

export function walletDisplayLabel(name: string): string {
  return name;
}
