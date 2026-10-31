"use client";

import { useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Btn } from "@/components/redesign/ui";
import {
  mapWalletNotReadyMessage,
  type PreferredSolanaWalletId,
  WALLET_INSTALL_URLS,
} from "@/lib/wallet/solanaWalletDiscovery";
import { connectSelectedSolanaWallet } from "@/lib/wallet/connectSelectedSolanaWallet";

const SUPPORTED_WALLETS: PreferredSolanaWalletId[] = ["Phantom", "Solflare"];

function isSupportedWallet(name: string): name is PreferredSolanaWalletId {
  return SUPPORTED_WALLETS.some((walletId) => walletId === name);
}

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function PassportSolanaWalletConnection() {
  const { connect, connected, connecting, disconnect, publicKey, select, wallet, wallets } = useWallet();
  const { setVisible } = useWalletModal();
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const walletRef = useRef(wallet);
  const publicKeyRef = useRef(publicKey);
  const connectedRef = useRef(connected);
  const walletsRef = useRef(wallets);
  const connectRef = useRef(connect);
  walletRef.current = wallet;
  publicKeyRef.current = publicKey;
  connectedRef.current = connected;
  walletsRef.current = wallets;
  connectRef.current = connect;

  async function connectWallet() {
    const selected = walletRef.current;
    if (!selected || !isSupportedWallet(selected.adapter.name)) {
      setVisible(true);
      return;
    }

    setError(null);
    try {
      await connectSelectedSolanaWallet({
        walletId: selected.adapter.name,
        wallets: walletsRef.current,
        select,
        connect: () => connectRef.current(),
        getSelectedWallet: () => walletRef.current,
        getPublicKey: () => publicKeyRef.current,
        isContextConnected: () => connectedRef.current,
        commitSelection: (name: WalletName) => select(name),
      });
    } catch (connectError) {
      const message = connectError instanceof Error ? connectError.message : "";
      if (/reject|denied|cancel/i.test(message)) {
        setError("Wallet connection cancelled. Choose a wallet to try again.");
      } else if (/wallet_adapter_not_ready|wallet_provider_unavailable|wallet_not_listed/i.test(message)) {
        setError(mapWalletNotReadyMessage(selected.adapter.name));
      } else {
        setError(message
          ? `Could not connect ${selected.adapter.name}: ${message}`
          : `Could not connect ${selected.adapter.name}. Try again.`);
      }
    }
  }

  async function disconnectWallet() {
    setError(null);
    setDisconnecting(true);
    try {
      await disconnect();
    } catch (disconnectError) {
      const message = disconnectError instanceof Error ? disconnectError.message : "";
      setError(message
        ? `Could not disconnect this wallet: ${message}`
        : "Could not disconnect this wallet. Try again from your wallet extension.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (connected && publicKey) {
    return (
      <div
        role="status"
        aria-label="Connected Solana wallet"
        style={{
          display: "grid",
          gap: "0.5rem",
          padding: "0.75rem",
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--surface-inset)",
        }}
      >
        <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "0.78rem", fontWeight: 700 }}>
          Connected · {wallet?.adapter.name ?? "Solana wallet"}
        </p>
        <code style={{ color: "var(--text-secondary)", fontSize: "0.72rem", overflowWrap: "anywhere" }}>
          {shortAddress(publicKey.toBase58())}
        </code>
        <Btn
          size="sm"
          variant="secondary"
          disabled={disconnecting}
          onClick={() => void disconnectWallet()}
        >
          {disconnecting ? "Disconnecting…" : "Disconnect wallet"}
        </Btn>
        {error ? <p role="alert" style={{ margin: 0, color: "#E0524F", fontSize: "0.72rem" }}>{error}</p> : null}
      </div>
    );
  }

  if (connected) {
    return (
      <p role="status" style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.74rem" }}>
        Wallet connected. Loading account…
      </p>
    );
  }

  const selectedWalletId: PreferredSolanaWalletId | null = wallet && isSupportedWallet(wallet.adapter.name)
    ? wallet.adapter.name
    : null;
  const selectedWalletReady = Boolean(
    wallet
      && (wallet.readyState === WalletReadyState.Installed || wallet.readyState === WalletReadyState.Loadable),
  );

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {selectedWalletId ? (
        <>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.74rem" }}>
            Selected wallet · {wallet?.adapter.name}
          </p>
          <Btn
            size="sm"
            variant="secondary"
            disabled={connecting || !selectedWalletReady}
            loading={connecting}
            onClick={() => void connectWallet()}
          >
            {connecting ? "Connecting…" : `Connect ${wallet?.adapter.name}`}
          </Btn>
          {!selectedWalletReady ? (
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.72rem" }}>
              Unlock {wallet?.adapter.name} or{" "}
              <a href={WALLET_INSTALL_URLS[selectedWalletId]} target="_blank" rel="noreferrer">
                install it
              </a>
              , then try again.
            </p>
          ) : null}
        </>
      ) : (
        <Btn size="sm" variant="secondary" onClick={() => setVisible(true)}>
          Choose a Solana wallet
        </Btn>
      )}
      {error ? <p role="alert" style={{ margin: 0, color: "#E0524F", fontSize: "0.72rem" }}>{error}</p> : null}
    </div>
  );
}
