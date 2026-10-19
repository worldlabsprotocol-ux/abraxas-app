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

export const WALLET_CONNECT_USER_TIMEOUT_MS = 120_000;

export type WalletConnectFailureContext = {
  walletId?: string;
  stage?: string;
  adapterReadyState?: string | null;
  selectionCommitted?: boolean;
  connectInvoked?: boolean;
};

/** Browser-safe diagnostics for support (no secrets). */
export function logWalletConnectFailure(error: unknown, context: WalletConnectFailureContext): void {
  if (typeof console === "undefined" || !console.info) return;
  const message = error instanceof Error ? error.message : String(error ?? "");
  const name = error instanceof Error ? error.name : "";
  console.info("[abraxas wallet connect]", {
    walletId: context.walletId ?? null,
    errorName: name || null,
    errorMessage: message.slice(0, 200),
    stage: context.stage ?? null,
    adapterReadyState: context.adapterReadyState ?? null,
    selectionCommitted: context.selectionCommitted ?? null,
    connectInvoked: context.connectInvoked ?? null,
  });
}

export function mapWalletConnectFailure(
  error: unknown,
  walletId?: string,
  context?: WalletConnectFailureContext,
): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const name = error instanceof Error ? error.name : "";
  if (message === "wallet_discovery_timeout" || name === "WalletDiscoveryTimeoutError") {
    return "Wallet discovery timed out. Refresh the page or unlock your wallet extension, then try Connect again.";
  }
  if (message === "wallet_connect_timeout") {
    return "Connection request timed out. Open your wallet extension and approve the connection, then try again.";
  }
  if (name === "WalletNotSelectedError" || message === "wallet_selection_not_committed") {
    return "Wallet selection did not finish. Click Connect again — if this repeats, refresh the page.";
  }
  if (
    message === "wallet_adapter_not_ready"
    || message === "wallet_adapter_not_ready_injectable"
    || message === "adapter_not_ready"
  ) {
    return walletId === "Solflare"
      ? "Solflare is not ready to connect. Unlock the extension, refresh, then try again."
      : "Phantom is not ready to connect. Unlock the extension, refresh, then try again.";
  }
  if (name === "WalletConnectionError" || message === "wallet_connection_rejected") {
    return "Connection request rejected. Open your wallet and approve the connection, or choose another wallet.";
  }
  if (name === "WalletNotReadyError") {
    return walletId === "Solflare"
      ? "Unlock Solflare in your browser toolbar, then click Connect again."
      : "Unlock Phantom in your browser toolbar, then click Connect again.";
  }
  const lower = message.toLowerCase();
  if (lower.includes("not ready")) {
    return walletId === "Solflare"
      ? "Solflare is not ready yet. Unlock the extension or try again."
      : "Phantom is not ready yet. Unlock the extension or try again.";
  }
  if (lower.includes("rejected") || lower.includes("user rejected") || lower.includes("cancel")) {
    return "Connection request dismissed. Choose a wallet and try again.";
  }
  if (lower.includes("not found") || lower.includes("not detected")) {
    return "Wallet not detected. Install the extension or choose another wallet.";
  }
  if (lower.includes("blocked") || lower.includes("popup")) {
    return "Wallet popup may be blocked. Allow popups for this site and try again.";
  }
  if (context?.stage === "invoke_connect" && !context.connectInvoked) {
    return "Connection did not start. Click Connect again.";
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

export function walletDisplayLabel(name: string): string {
  return name;
}
