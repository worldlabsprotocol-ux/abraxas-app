"use client";
// FILE: components/partner/WalletControlRecoveryPanel.tsx
// Canonical wallet-control recovery — connect + SIWE sign, no wallet manager chrome.

import { useCallback, useState } from "react";
import { useBindEvmWallet } from "@/lib/walletAuthority/client/useBindEvmWallet";
import { Btn } from "@/components/redesign/ui";

export interface WalletControlRecoveryPanelProps {
  onVerified: () => void | Promise<void>;
  onCancel?: () => void;
}

export function WalletControlRecoveryPanel({
  onVerified,
  onCancel,
}: WalletControlRecoveryPanelProps) {
  const evmBind = useBindEvmWallet({ chainId: 1 });
  const [localError, setLocalError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const connectAndSign = useCallback(async () => {
    setLocalError(null);
    setVerifying(true);
    try {
      if (evmBind.uiState.showInjected) {
        await evmBind.bindInjected();
      } else if (evmBind.uiState.showWalletConnect) {
        await evmBind.bindWalletConnect();
      } else {
        throw new Error(evmBind.uiState.blockedHint ?? "No wallet connection available in this browser.");
      }
      await onVerified();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not verify wallet";
      if (/reject|denied|cancel/i.test(msg)) {
        setLocalError("Signature cancelled. Try again when you're ready.");
      } else {
        setLocalError(msg);
      }
    } finally {
      setVerifying(false);
    }
  }, [evmBind, onVerified]);

  const loading = verifying || evmBind.loading;
  const blocked = !evmBind.uiState.showInjected && !evmBind.uiState.showWalletConnect;

  return (
    <div style={{ marginTop: "0.85rem" }}>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", lineHeight: 1.55, color: "var(--text-secondary, #cbd5e1)" }}>
        Choose or connect a wallet, then sign the verification message.
      </p>
      {blocked ? (
        <p role="status" style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", lineHeight: 1.55, color: "var(--text-muted, #94a3b8)" }}>
          {evmBind.uiState.blockedHint}
        </p>
      ) : null}
      {localError ? (
        <p role="alert" style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", lineHeight: 1.55, color: "#f87171" }}>
          {localError}
        </p>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {!blocked ? (
          <Btn disabled={loading} onClick={() => void connectAndSign()}>
            {loading ? "Verifying…" : "Connect wallet"}
          </Btn>
        ) : null}
        {onCancel ? (
          <Btn variant="secondary" disabled={loading} onClick={onCancel}>
            Back
          </Btn>
        ) : null}
      </div>
    </div>
  );
}
