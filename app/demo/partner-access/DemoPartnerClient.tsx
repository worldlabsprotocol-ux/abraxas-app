"use client";
// FILE: app/demo/partner-access/DemoPartnerClient.tsx
// DEMO — tokenized asset access page; unlocks only after live receipt validation.

import { useCallback, useEffect, useState } from "react";
import { EvmWalletConnectActions } from "@/components/wallet/EvmWalletConnectActions";
import { connectEvmWallet } from "@/lib/walletAuthority/client/bindEvmWallet";
import { resolveEvmConnectionUiStateFromWindow } from "@/lib/walletAuthority/client/evmConnectionUi";

export default function DemoPartnerClient() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [chainId, setChainId] = useState(1);
  const [authRequestId, setAuthRequestId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [uiState, setUiState] = useState(resolveEvmConnectionUiStateFromWindow);

  useEffect(() => {
    setUiState(resolveEvmConnectionUiStateFromWindow());
  }, []);

  const validate = useCallback(async (requestId: string) => {
    const res = await fetch(`/api/demo/partner-access/validate?authorization_request_id=${requestId}`);
    const data = await res.json() as { action_unlocked?: boolean; approved?: boolean; validity?: string; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Validation failed");
    setUnlocked(Boolean(data.action_unlocked));
    setStatus(data.approved
      ? data.action_unlocked
        ? "Approved — receipt currently valid"
        : `Approved but not currently valid (${data.validity ?? "unknown"})`
      : "Not approved");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("authorization_request_id");
    const st = params.get("status");
    if (id) {
      setAuthRequestId(id);
      void validate(id).catch(e => setError(e instanceof Error ? e.message : "Validate failed"));
    }
    if (st) setStatus(st);
  }, [validate]);

  async function connectWithMethod(method: "injected" | "walletconnect") {
    setConnectLoading(true);
    setError("");
    try {
      const connection = await connectEvmWallet({ method });
      setWallet(connection.address);
      setChainId(connection.chainId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet connect failed");
    } finally {
      setConnectLoading(false);
    }
  }

  async function startVerify() {
    if (!wallet) {
      setError("Connect a wallet first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/demo/partner-access/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: wallet, chain_id: chainId }),
      });
      const data = await res.json() as { hosted_connect_url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to start");
      if (data.hosted_connect_url) {
        window.location.href = data.hosted_connect_url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "2rem auto", padding: "1.5rem", fontFamily: "system-ui,sans-serif", color: "#f0f0f0", background: "#0d1017", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ fontSize: "0.65rem", color: "#FBBF24", letterSpacing: "0.12em", marginBottom: 8 }}>DEMO — NOT A LIVE PARTNER</div>
      <h1 style={{ fontSize: "1.15rem", margin: "0 0 0.5rem" }}>Tokenized Asset Access (Demo)</h1>
      <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
        Connect MetaMask, verify eligibility through Abraxas Connect, and unlock Request Access only when a live Decision Receipt passes Trust Layer validation.
      </p>

      <div style={{ margin: "1.25rem 0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {!wallet ? (
          <EvmWalletConnectActions
            uiState={uiState}
            loading={connectLoading}
            connectOnly
            onInjected={() => void connectWithMethod("injected")}
            onWalletConnect={() => void connectWithMethod("walletconnect")}
          />
        ) : (
          <p style={{ fontSize: "0.8rem", color: "#a78bfa" }}>Connected: {wallet.slice(0, 8)}… (chain {chainId})</p>
        )}
        <button type="button" onClick={() => void startVerify()} disabled={loading || !wallet} style={{ padding: "0.65rem", cursor: "pointer", borderRadius: 6, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 600 }}>
          {loading ? "Starting…" : "Verify eligibility (Abraxas Connect)"}
        </button>
      </div>

      {authRequestId && (
        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", wordBreak: "break-all" }}>
          Request: {authRequestId}
        </p>
      )}

      {status && <p style={{ fontSize: "0.8rem", color: "#a78bfa" }}>{status}</p>}
      {error && <p style={{ fontSize: "0.8rem", color: "#f26b6b" }}>{error}</p>}

      <button
        type="button"
        disabled={!unlocked}
        style={{
          marginTop: "1rem",
          width: "100%",
          padding: "0.75rem",
          borderRadius: 6,
          border: "none",
          fontWeight: 700,
          cursor: unlocked ? "pointer" : "not-allowed",
          background: unlocked ? "#14F195" : "rgba(255,255,255,0.08)",
          color: unlocked ? "#000" : "rgba(255,255,255,0.25)",
        }}
      >
        Request Access {unlocked ? "" : "(locked)"}
      </button>

      <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: "1rem" }}>
        Requires Passport sign-in + policy <code>abraxas-booking-v1</code> claims. No hardcoded approval.
      </p>
    </div>
  );
}
