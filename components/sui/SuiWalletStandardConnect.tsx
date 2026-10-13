"use client";
// FILE: components/sui/SuiWalletStandardConnect.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { getWallets } from "@wallet-standard/app";
import type { Wallet } from "@wallet-standard/base";
import {
  StandardConnect,
  StandardDisconnect,
  type StandardConnectMethod,
  type StandardDisconnectMethod,
} from "@wallet-standard/features";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  filterSuiCompatibleWallets,
  resolveSuiNetworkLabel,
} from "@/lib/sui/walletStandard/discoverSuiWallets";
import {
  HOLDER_WALLET_CONNECTING,
  HOLDER_WALLET_DISCONNECT,
  HOLDER_WALLET_NO_EXTENSION,
  HOLDER_WALLET_PRIMARY_LABEL,
} from "@/lib/sui/holderAccessCopy";
import { truncateSuiAddress } from "./SuiAuthProvider";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#4CBB92";
const STORAGE_KEY = "abraxas_holder_wallet_connect_v1";

export type HolderWalletConnection = {
  walletName: string;
  address: string;
  chain: string;
};

function readStoredConnection(): HolderWalletConnection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HolderWalletConnection;
    if (!parsed?.address || !parsed.walletName) return null;
    return { ...parsed, address: normalizeSuiAddress(parsed.address) };
  } catch {
    return null;
  }
}

function writeStoredConnection(value: HolderWalletConnection | null) {
  if (typeof window === "undefined") return;
  if (!value) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function SuiWalletStandardConnect({
  expectedAddress,
  onConnectionChange,
  compact = false,
}: {
  expectedAddress?: string | null;
  onConnectionChange?: (connection: HolderWalletConnection | null) => void;
  compact?: boolean;
}) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [connection, setConnection] = useState<HolderWalletConnection | null>(() => readStoredConnection());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = getWallets();
    const sync = () => setWallets(filterSuiCompatibleWallets(api.get()));
    sync();
    return api.on("register", sync);
  }, []);

  useEffect(() => {
    onConnectionChange?.(connection);
  }, [connection, onConnectionChange]);

  const networkLabel = useMemo(() => resolveSuiNetworkLabel(), []);

  const mismatch = expectedAddress && connection
    ? normalizeSuiAddress(expectedAddress) !== connection.address
    : false;

  const connectWallet = useCallback(async (wallet: Wallet) => {
    setBusy(true);
    setError(null);
    try {
      const connect = (wallet.features[StandardConnect] as { connect?: StandardConnectMethod } | undefined)?.connect;
      if (!connect) {
        setError(HOLDER_WALLET_NO_EXTENSION);
        return;
      }
      const { accounts } = await connect();
      const suiAccount = accounts.find((a) => a.chains.some((c) => c.startsWith("sui:")));
      if (!suiAccount) {
        setError("This wallet did not return a Sui account for the selected network.");
        return;
      }
      const chain = suiAccount.chains.find((c) => c.startsWith("sui:")) ?? "sui:devnet";
      const next: HolderWalletConnection = {
        walletName: wallet.name,
        address: normalizeSuiAddress(suiAccount.address),
        chain,
      };
      setConnection(next);
      writeStoredConnection(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet connection was cancelled.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setError(null);
    const active = wallets.find((w) => w.name === connection?.walletName);
    const feature = (active?.features[StandardDisconnect] as { disconnect?: StandardDisconnectMethod } | undefined)?.disconnect;
    if (feature) {
      try {
        await feature();
      } catch {
        /* wallet may already be disconnected */
      }
    }
    setConnection(null);
    writeStoredConnection(null);
  }, [connection?.walletName, wallets]);

  if (connection) {
    return (
      <div
        style={{
          border: `1px solid ${mismatch ? "#E0524F55" : `${ACCENT}44`}`,
          borderRadius: compact ? 10 : 12,
          padding: compact ? "0.75rem 1rem" : "1rem 1.15rem",
          background: mismatch ? "rgba(224, 82, 79, 0.06)" : `${ACCENT}0A`,
        }}
      >
        <p style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.35rem" }}>
          Wallet connected
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 0.25rem" }}>
          {connection.walletName} · {networkLabel}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.65rem", wordBreak: "break-all" }}>
          {truncateSuiAddress(connection.address, 10, 8)}
        </p>
        <button
          type="button"
          onClick={() => void disconnect()}
          style={{
            padding: "0.45rem 0.85rem",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontFamily: FONT,
            fontSize: "0.72rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {HOLDER_WALLET_DISCONNECT}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {wallets.length === 0 ? (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
          {HOLDER_WALLET_NO_EXTENSION}
        </p>
      ) : (
        wallets.map((wallet) => (
          <button
            key={wallet.name}
            type="button"
            disabled={busy}
            onClick={() => void connectWallet(wallet)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              padding: compact ? "0.6rem 0.85rem" : "0.7rem 1rem",
              borderRadius: 10,
              border: "none",
              background: ACCENT,
              color: "#04110c",
              fontFamily: FONT,
              fontSize: compact ? "0.78rem" : "0.82rem",
              fontWeight: 700,
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.75 : 1,
            }}
          >
            <span>{busy ? HOLDER_WALLET_CONNECTING : `${HOLDER_WALLET_PRIMARY_LABEL} · ${wallet.name}`}</span>
            <span style={{ fontSize: "0.68rem", fontWeight: 600, opacity: 0.85 }}>{networkLabel}</span>
          </button>
        ))
      )}
      {error ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#E0524F", margin: 0, lineHeight: 1.5 }}>{error}</p>
      ) : null}
    </div>
  );
}
