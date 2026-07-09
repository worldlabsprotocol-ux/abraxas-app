"use client";
// FILE: app/connect/authorize/ConnectAuthorizeClient.tsx

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface ConnectPreview {
  authorization: {
    authorization_request_id: string;
    partner_id: string;
    policy_id: string;
    requested_action: string | null;
    status: string;
    expires_at: string;
    wallet_address: string | null;
    chain: string;
  };
  policy_name: string;
  never_shared: string[];
}

function getEthereumProvider(): { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | undefined {
  return (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
}

export default function ConnectAuthorizeClient({ requestId }: { requestId: string }) {
  const [preview, setPreview] = useState<ConnectPreview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [bound, setBound] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/connect/authorize/${requestId}`);
    const data = await res.json() as ConnectPreview & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to load");
    setPreview(data);
  }, [requestId]);

  useEffect(() => {
    void load().catch(e => setError(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  async function bindEvmWallet() {
    const ethereum = getEthereumProvider();
    if (!ethereum) {
      setError("MetaMask not detected. Install MetaMask to bind an EVM wallet.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const address = Array.isArray(accounts) ? accounts[0] as string : null;
      if (!address) throw new Error("No account selected");
      setEvmAddress(address);

      const chainHex = await ethereum.request({ method: "eth_chainId" });
      const chainId = parseInt(String(chainHex), 16);

      const chRes = await fetch("/api/wallet-authority/evm/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ wallet_address: address, chain_id: chainId }),
      });
      const ch = await chRes.json() as { challenge_id?: string; message?: string; error?: string };
      if (!chRes.ok) throw new Error(ch.error ?? "Challenge failed");

      const signature = await ethereum.request({
        method: "personal_sign",
        params: [ch.message, address],
      }) as string;

      const bindRes = await fetch("/api/wallet-authority/evm/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ challenge_id: ch.challenge_id, signature }),
      });
      const bindData = await bindRes.json() as { ok?: boolean; error?: string };
      if (!bindRes.ok) throw new Error(bindData.error ?? "Bind failed");
      setBound(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet bind failed");
    } finally {
      setLoading(false);
    }
  }

  async function consent() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/connect/authorize/${requestId}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json() as { redirect_url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Consent failed");
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Consent failed");
    } finally {
      setLoading(false);
    }
  }

  if (!preview) {
    return (
      <div style={{ padding: "2rem", color: "#ccc", fontFamily: "monospace" }}>
        {error || "Loading authorization request…"}
      </div>
    );
  }

  const needsEvmBind = preview.authorization.chain === "evm" && preview.authorization.wallet_address;

  return (
    <div style={{ maxWidth: 520, margin: "2rem auto", padding: "1.5rem", fontFamily: "system-ui,sans-serif", color: "#f0f0f0", background: "#0d1017", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ fontSize: "0.7rem", color: "#a78bfa", letterSpacing: "0.1em", marginBottom: 8 }}>ABRAXAS CONNECT</div>
      <h1 style={{ fontSize: "1.1rem", margin: "0 0 1rem" }}>Authorization request</h1>

      <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
        Partner <strong>{preview.authorization.partner_id}</strong> is requesting eligibility verification
        for policy <strong>{preview.policy_name}</strong>.
      </p>

      {preview.authorization.requested_action && (
        <p style={{ fontSize: "0.8rem" }}>Action: {preview.authorization.requested_action}</p>
      )}

      {preview.authorization.wallet_address && (
        <p style={{ fontSize: "0.75rem", wordBreak: "break-all", color: "rgba(255,255,255,0.5)" }}>
          Wallet: {preview.authorization.wallet_address}
        </p>
      )}

      <div style={{ margin: "1rem 0", padding: "0.75rem", background: "rgba(255,255,255,0.04)", borderRadius: 6, fontSize: "0.75rem" }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Never shared</div>
        {preview.never_shared.map(item => (
          <div key={item} style={{ color: "rgba(255,255,255,0.45)" }}>· {item}</div>
        ))}
      </div>

      {needsEvmBind && !bound && (
        <button type="button" onClick={() => void bindEvmWallet()} disabled={loading} style={{ width: "100%", padding: "0.65rem", marginBottom: "0.5rem", cursor: "pointer", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6 }}>
          {loading ? "Binding…" : "Bind MetaMask wallet to Passport"}
        </button>
      )}

      {bound && evmAddress && (
        <p style={{ fontSize: "0.75rem", color: "#14F195" }}>Wallet bound: {evmAddress.slice(0, 10)}…</p>
      )}

      <button
        type="button"
        onClick={() => void consent()}
        disabled={loading || (needsEvmBind && !bound) || preview.authorization.status === "expired"}
        style={{ width: "100%", padding: "0.75rem", cursor: "pointer", background: "#14F195", color: "#000", border: "none", borderRadius: 6, fontWeight: 600 }}
      >
        {loading ? "Processing…" : "Consent and evaluate policy"}
      </button>

      {error && <p style={{ color: "#f26b6b", fontSize: "0.8rem", marginTop: "0.75rem" }}>{error}</p>}

      <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", marginTop: "1rem" }}>
        Sign in to Passport first if prompted. Expires {new Date(preview.authorization.expires_at).toLocaleString()}.
      </p>

      <Link href="/passport" style={{ fontSize: "0.75rem", color: "#a78bfa" }}>Open Passport →</Link>
    </div>
  );
}
