"use client";
// FILE: components/wallet/EvmWalletConnectActions.tsx
// Shared connect/bind buttons. injected provider or WalletConnect on mobile.

import type { EvmConnectionUiState } from "@/lib/walletAuthority/client/evmConnectionUi";

interface Props {
  uiState: EvmConnectionUiState;
  loading?: boolean;
  onInjected: () => void;
  onWalletConnect: () => void;
  injectedLabel?: string;
  walletConnectLabel?: string;
  connectOnly?: boolean;
}

export function EvmWalletConnectActions({
  uiState,
  loading = false,
  onInjected,
  onWalletConnect,
  injectedLabel = "Connect MetaMask",
  walletConnectLabel = "Connect via WalletConnect",
  connectOnly = false,
}: Props) {
  const bindSuffix = connectOnly ? "" : " wallet to Passport";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }}>
      {uiState.showInjected && (
        <button
          type="button"
          onClick={onInjected}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.65rem",
            cursor: loading ? "wait" : "pointer",
            background: "#7c3aed",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          {loading ? "Connecting…" : `${injectedLabel}${bindSuffix}`}
        </button>
      )}

      {uiState.showWalletConnect && (
        <button
          type="button"
          onClick={onWalletConnect}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.65rem",
            cursor: loading ? "wait" : "pointer",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          {loading ? "Connecting…" : `${walletConnectLabel}${bindSuffix}`}
        </button>
      )}

      {uiState.blockedHint && (
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: 0 }}>
          {uiState.blockedHint}
        </p>
      )}

      <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.45, margin: 0 }}>
        {uiState.sessionHint}
      </p>
    </div>
  );
}
