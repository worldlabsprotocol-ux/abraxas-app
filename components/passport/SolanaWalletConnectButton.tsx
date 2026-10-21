"use client";
// FILE: components/passport/SolanaWalletConnectButton.tsx

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import {
  detectPhantomInjectable,
  detectSolflareInjectable,
  WALLET_INSTALL_URLS,
} from "@/lib/wallet/solanaWalletDiscovery";
import { connectSelectedSolanaWallet } from "@/lib/wallet/connectSelectedSolanaWallet";
import type { PreferredSolanaWalletId } from "@/lib/wallet/solanaWalletDiscovery";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function SolanaWalletConnectButton() {
  const { connect, connected, connecting, wallet, wallets, select, publicKey } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [discoverySettled, setDiscoverySettled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDiscoverySettled(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const phantomListed = useMemo(
    () => wallets.find((w) => w.adapter.name === "Phantom") ?? null,
    [wallets],
  );

  const phantomReady = Boolean(
    detectPhantomInjectable()
    || phantomListed?.readyState === WalletReadyState.Installed
    || phantomListed?.readyState === WalletReadyState.Loadable,
  );

  const solflareReady = Boolean(
    detectSolflareInjectable()
    || wallets.find((w) => w.adapter.name === "Solflare")?.readyState === WalletReadyState.Installed,
  );

  if (connected) return null;

  async function connectPreferred(walletId: PreferredSolanaWalletId) {
    setError(null);
    try {
      await connectSelectedSolanaWallet({
        walletId,
        wallets,
        select,
        connect,
        getSelectedWallet: () => wallet ?? null,
        getPublicKey: () => publicKey,
        isContextConnected: () => connected,
        commitSelection: select,
      });
    } catch {
      setError("Could not connect Solana wallet. Confirm the extension is unlocked.");
    }
  }

  if (phantomReady || wallet) {
    return (
      <div style={{ marginBottom: "0.35rem" }}>
        <button
          type="button"
          disabled={connecting}
          onClick={() => void connectPreferred((wallet?.adapter.name as PreferredSolanaWalletId) ?? "Phantom")}
          style={{
            padding: "0.55rem 0.85rem",
            borderRadius: 10,
            border: "1px solid var(--border-subtle, #333)",
            background: "transparent",
            color: "var(--text-primary, #fff)",
            fontFamily: FONT,
            fontWeight: 600,
            cursor: connecting ? "wait" : "pointer",
            width: "100%",
          }}
        >
          {connecting ? "Connecting…" : wallet ? `Connect ${wallet.adapter.name}` : "Connect Phantom"}
        </button>
        {error ? <p style={{ color: "#E0524F", fontSize: "0.72rem", margin: "0.25rem 0 0" }}>{error}</p> : null}
      </div>
    );
  }

  if (!discoverySettled) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.35rem" }}>
        Detecting Solana wallet extensions…
      </p>
    );
  }

  return (
    <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.35rem" }}>
      Install{" "}
      <a href={WALLET_INSTALL_URLS.Phantom} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
        Phantom
      </a>
      {solflareReady ? null : (
        <>
          {" "}or{" "}
          <a href={WALLET_INSTALL_URLS.Solflare} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
            Solflare
          </a>
        </>
      )}
      , then return here to connect.
    </p>
  );
}
