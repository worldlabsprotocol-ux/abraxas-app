// FILE: app/deposit/[vaultId]/page.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { VAULTS, fmtUSD } from "@/lib/appData";
import { depositToVault, TxState, ABRAPMetadata } from "@/lib/protocolService";
import { addPosition } from "@/lib/positionStore";
import { logEvent } from "@/lib/activityStore";
import { useAuth } from "@/lib/authState";

interface DepositResult {
  mintAddress:  string;
  tokenAccount: string;
  txSignature:  string;
  explorerUrl:  string;
  tokenName:    string;
  tokenSymbol:  string;
  metadata:     ABRAPMetadata;
  simulated:    boolean;
}

function DepositInner({ params }: { params: { vaultId: string } }) {
  const router  = useRouter();
  const qParams = useSearchParams();
  const { walletAddressFull, walletConnected } = useAuth();
  const vault = VAULTS.find((v) => v.id === params.vaultId);

  // Read position metadata passed from operate page
  const passedMeta = (() => {
    try { return JSON.parse(qParams?.get("meta") ?? "{}"); } catch { return {}; }
  })();

  const [txState, setTxState] = useState<TxState>("idle");
  const [amount,  setAmount]  = useState("");
  const [agreed,  setAgreed]  = useState(false);
  const [result,  setResult]  = useState<DepositResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  if (!vault) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "4rem 1.25rem", textAlign: "center" }}>
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Vault not found.</p>
        <Link href="/operate" style={{ color: "var(--gold)" }}>Browse vaults →</Link>
      </div>
    );
  }

  const usd     = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  const annual  = usd > 0 ? Math.round(usd * vault.apy / 100) : 0;
  const monthly = Math.round(annual / 12);

  const displayName = passedMeta.displayName || `${vault.asset} Position — ${vault.name}`;
  const description = passedMeta.description || vault.howItEarns;

  const submit = async () => {
    if (!walletConnected || !walletAddressFull) {
      setError("Connect your wallet to deposit.");
      setTxState("error");
      return;
    }
    if (usd <= 0) {
      setError("Enter an amount.");
      setTxState("error");
      return;
    }

    setTxState("validating");
    await new Promise((r) => setTimeout(r, 400));
    setTxState("submitting");
    await new Promise((r) => setTimeout(r, 600));
    setTxState("minting");

    const res = await depositToVault({
      userWallet:  walletAddressFull,
      vaultId:     vault.id,
      vaultName:   vault.name,
      assetType:   vault.asset,
      principal:   usd,
      apy:         vault.apy,
      displayName,
      description,
    });

    if (!res.ok) {
      setError(res.error ?? "Deposit failed.");
      setTxState("error");
      return;
    }

    // Write position to store — drives dashboard
    addPosition({
      userWallet:   walletAddressFull,
      vaultId:      vault.id,
      vaultName:    vault.name,
      assetType:    vault.asset,
      displayName,
      description,
      principal:    usd,
      apy:          vault.apy,
      mintAddress:  res.mintAddress,
      txSignature:  res.txSignature,
      explorerUrl:  res.explorerUrl,
      tokenName:    res.tokenName,
      tokenSymbol:  res.tokenSymbol,
      simulated:    res.simulated,
      status:       "operating",
    });

    // Log events — same store as live feed
    logEvent({ type: "deposit",  userWallet: walletAddressFull, vaultId: vault.id, vaultName: vault.name, assetType: vault.asset, amount: usd, message: `Position opened — ${displayName}`, txSignature: res.txSignature, simulated: res.simulated });
    logEvent({ type: "mint",     userWallet: walletAddressFull, vaultId: vault.id, vaultName: vault.name, assetType: vault.asset, message: `ABRAP minted — ${res.tokenName}`,              txSignature: res.txSignature, simulated: res.simulated });

    setResult({
      mintAddress:  res.mintAddress,
      tokenAccount: res.tokenAccount,
      txSignature:  res.txSignature,
      explorerUrl:  res.explorerUrl,
      tokenName:    res.tokenName,
      tokenSymbol:  res.tokenSymbol,
      metadata:     res.metadata,
      simulated:    res.simulated,
    });
    setTxState("active");
  };

  // ── SUCCESS ─────────────────────────────────────────────────────────────────
  if (txState === "active" && result) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ width: "60px", height: "60px", margin: "0 auto 1rem", borderRadius: "50%", background: "rgba(61,214,140,0.12)", border: "2px solid var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>✓</div>
          <h2 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.4rem" }}>Deposit confirmed.</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{fmtUSD(usd)} into {vault.name} · {vault.agent} is operating.</p>
        </div>

        {/* Confirmation */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden", marginBottom: "0.875rem" }}>
          {[
            { k: "Position name",  v: displayName },
            { k: "Vault",          v: vault.name  },
            { k: "Asset",          v: vault.asset },
            { k: "Amount",         v: fmtUSD(usd), bold: true },
            { k: "APY",            v: `${vault.apy}%`, green: true },
            { k: "Status",         v: result.simulated ? "Simulated — configure VAULT_AUTHORITY_SECRET for live" : "Confirmed on-chain" },
          ].map(({ k, v, bold, green }, i, arr) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.65rem 1.1rem", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--subtle)" }}>{k}</span>
              <span style={{ fontSize: "0.75rem", fontWeight: bold ? 700 : 500, color: green ? "var(--green)" : "var(--text)", maxWidth: "240px", textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* ABRAP token panel */}
        <div style={{ background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.25)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "0.875rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.625rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--green)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              ABRAP position token {result.simulated ? "(simulated)" : "— in your wallet"}
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.15rem" }}>{result.tokenName}</div>
          <div style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", marginBottom: "0.625rem" }}>
            {result.tokenSymbol} · Token-2022 · {vault.apy}% APY · {vault.asset}
          </div>
          {/* Token metadata — same fields as on-chain metadata */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", fontSize: "0.62rem", color: "var(--subtle)", marginBottom: "0.625rem" }}>
            <span>Vault: <span style={{ color: "var(--text)" }}>{result.metadata?.vaultName}</span></span>
            <span>Owner: <span style={{ color: "var(--text)", fontFamily: "'JetBrains Mono', monospace" }}>{walletAddressFull?.slice(0,8)}…</span></span>
            <span>Created: <span style={{ color: "var(--text)" }}>{new Date().toLocaleDateString()}</span></span>
            <span>Status: <span style={{ color: "var(--green)" }}>operating</span></span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "var(--gold)", wordBreak: "break-all", background: "rgba(200,169,110,0.08)", padding: "0.4rem 0.625rem", borderRadius: "5px", marginBottom: "0.625rem" }}>
            {result.mintAddress}
          </div>
          <div style={{ fontSize: "0.65rem", color: "var(--subtle)", marginBottom: "0.5rem" }}>
            {result.simulated
              ? "Simulation — token structure is real. Add VAULT_AUTHORITY_SECRET to Vercel to broadcast on-chain."
              : "Open Phantom or Solflare → Tokens tab. Look for ABRAP. If not visible immediately, import the mint address above."}
          </div>
          {result.simulated && (
            <div style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>
              Wallet display depends on wallet metadata indexing. View verified metadata on Solscan.
            </div>
          )}
          <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
            <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>View tx on Solscan ↗</a>
            <a href={`https://solscan.io/token/${result.mintAddress}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none" }}>View token ↗</a>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <button style={{ width: "100%", background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "10px", padding: "0.85rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Dashboard</button>
          </Link>
          <Link href={`/vault/${vault.id}`} style={{ textDecoration: "none" }}>
            <button style={{ width: "100%", background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.85rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>View vault</button>
          </Link>
        </div>
      </div>
    );
  }

  // ── PROCESSING ──────────────────────────────────────────────────────────────
  if (txState === "validating" || txState === "submitting" || txState === "minting") {
    const stateStr = txState as string;
    const steps = [
      { key: "validating", label: "Validating wallet and vault",   doneStates: ["submitting","minting","active"] },
      { key: "submitting", label: "Submitting deposit transaction", doneStates: ["minting","active"]             },
      { key: "minting",    label: "Minting ABRAP position token",   doneStates: ["active"]                       },
    ];
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "3rem 1.25rem 4rem" }}>
        <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1.75rem", textAlign: "center" }}>Processing deposit…</p>
        {steps.map((s) => {
          const done   = s.doneStates.includes(stateStr);
          const active = stateStr === s.key;
          return (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem 1.1rem", background: done ? "rgba(61,214,140,0.06)" : active ? "rgba(200,169,110,0.06)" : "var(--surface)", border: `1px solid ${done ? "rgba(61,214,140,0.2)" : active ? "rgba(200,169,110,0.2)" : "var(--line)"}`, borderRadius: "10px", marginBottom: "0.625rem" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0, background: done ? "var(--green)" : "transparent", border: `2px solid ${done ? "var(--green)" : active ? "var(--gold)" : "var(--line)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {done   && <span style={{ color: "var(--void)", fontSize: "0.6rem", fontWeight: 700 }}>✓</span>}
                {active && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--gold)", animation: "pulse 1s ease-in-out infinite" }} />}
              </div>
              <span style={{ fontSize: "0.82rem", fontWeight: done || active ? 600 : 400, color: done ? "var(--green)" : active ? "var(--text)" : "var(--subtle)" }}>{s.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── INPUT / REVIEW ──────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--subtle)", fontSize: "0.75rem", cursor: "pointer", marginBottom: "1.25rem" }}>← Back</button>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.875rem 1.25rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{displayName}</div>
          <div style={{ fontSize: "0.68rem", color: "var(--subtle)" }}>{vault.name} · {vault.asset}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--green)" }}>{vault.apy}%</div>
          <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase" }}>APY</div>
        </div>
      </div>

      {/* Amount input */}
      <div style={{ position: "relative", marginBottom: "0.75rem" }}>
        <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: "1.2rem" }}>$</span>
        <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" style={{ width: "100%", boxSizing: "border-box", padding: "1rem 1rem 1rem 2.25rem", fontSize: "1.5rem", fontWeight: 700, textAlign: "center", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: "10px", outline: "none", fontFamily: "'Space Grotesk', sans-serif" }} />
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", justifyContent: "center" }}>
        {["500","1000","5000","10000"].map((v) => (
          <button key={v} onClick={() => setAmount(v)} style={{ background: amount === v ? "rgba(200,169,110,0.12)" : "var(--surface)", border: `1px solid ${amount === v ? "var(--gold)" : "var(--line)"}`, color: amount === v ? "var(--gold)" : "var(--muted)", borderRadius: "6px", padding: "0.3rem 0.65rem", fontSize: "0.72rem", cursor: "pointer" }}>
            ${parseInt(v).toLocaleString()}
          </button>
        ))}
      </div>

      {usd > 0 && (
        <div style={{ background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: "10px", padding: "0.875rem 1.25rem", marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", textAlign: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--green)" }}>{fmtUSD(annual)}</div>
            <div style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>per year</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--green)" }}>{fmtUSD(monthly)}</div>
            <div style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>per month</div>
          </div>
        </div>
      )}

      {usd > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden", marginBottom: "0.875rem" }}>
          {[
            { k: "Position name",  v: displayName },
            { k: "Vault",          v: vault.name },
            { k: "Asset",          v: vault.asset },
            { k: "Amount",         v: fmtUSD(usd), bold: true },
            { k: "APY",            v: `${vault.apy}%`, green: true },
            { k: "Token",          v: "ABRAP · Token-2022 · Solana" },
          ].map(({ k, v, bold, green }, i, arr) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 1.1rem", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--subtle)" }}>{k}</span>
              <span style={{ fontSize: "0.75rem", fontWeight: bold ? 700 : 500, color: green ? "var(--green)" : "var(--text)" }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {txState === "error" && error && (
        <div style={{ background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.25)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
          <p style={{ fontSize: "0.78rem", color: "#f26b6b", margin: 0 }}>{error}</p>
        </div>
      )}

      {usd > 0 && (
        <label style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.7rem 0.875rem", background: "rgba(200,169,110,0.04)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: "8px", cursor: "pointer", marginBottom: "0.875rem", boxSizing: "border-box", width: "100%" }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.55 }}>
            Beta · Non-custodial · ABRAP token minted to my wallet · I retain full ownership
          </span>
        </label>
      )}

      <button
        disabled={usd <= 0 || !agreed}
        onClick={submit}
        style={{ width: "100%", background: usd > 0 && agreed ? "var(--gold)" : "var(--surface)", color: usd > 0 && agreed ? "var(--void)" : "var(--subtle)", border: "none", borderRadius: "10px", padding: "0.95rem", fontWeight: 700, fontSize: "0.9rem", cursor: usd > 0 && agreed ? "pointer" : "not-allowed" }}
      >
        {usd <= 0 ? "Enter an amount" : !agreed ? "Accept terms to continue" : "Confirm deposit"}
      </button>
    </div>
  );
}

export default function DepositPage({ params }: { params: { vaultId: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center", color: "var(--subtle)" }}>Loading…</div>}>
      <DepositInner params={params} />
    </Suspense>
  );
}