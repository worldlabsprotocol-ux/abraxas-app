"use client";
// FILE: lib/walletAuthority/client/evmConnectionUi.ts
// Pure UI routing for injected vs WalletConnect (testable without React).

import { BROWSER_SESSION_HINT } from "@/lib/auth/sessionErrors";
import { isMobileWalletContext } from "@/lib/walletAuthority/client/detectMobileBrowser";

export interface EvmConnectionUiState {
  showInjected: boolean;
  showWalletConnect: boolean;
  /** Shown when neither path is available (e.g. desktop without extension). */
  blockedHint: string | null;
  sessionHint: string;
}

export function walletConnectProjectIdConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim());
}

export function resolveEvmConnectionUiState(input: {
  hasInjectedProvider: boolean;
  isMobile?: boolean;
  walletConnectConfigured?: boolean;
}): EvmConnectionUiState {
  const isMobile = input.isMobile ?? false;
  const wcConfigured = input.walletConnectConfigured ?? walletConnectProjectIdConfigured();
  const sessionHint = BROWSER_SESSION_HINT;

  if (input.hasInjectedProvider) {
    return {
      showInjected: true,
      showWalletConnect: false,
      blockedHint: null,
      sessionHint,
    };
  }

  if (isMobile && wcConfigured) {
    return {
      showInjected: false,
      showWalletConnect: true,
      blockedHint: null,
      sessionHint,
    };
  }

  if (isMobile) {
    return {
      showInjected: false,
      showWalletConnect: false,
      blockedHint:
        "No injected wallet in this browser. Open this page in MetaMask's in-app browser (Menu → Browser), or set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to enable WalletConnect.",
      sessionHint,
    };
  }

  return {
    showInjected: false,
    showWalletConnect: false,
    blockedHint:
      "Install the MetaMask browser extension, or use a wallet's in-app browser on mobile.",
    sessionHint,
  };
}

export function resolveEvmConnectionUiStateFromWindow(): EvmConnectionUiState {
  const hasInjected =
    typeof window !== "undefined"
    && Boolean((window as unknown as { ethereum?: unknown }).ethereum);
  return resolveEvmConnectionUiState({
    hasInjectedProvider: hasInjected,
    isMobile: isMobileWalletContext(),
  });
}
