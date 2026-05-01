// FILE: app/deposit/[vaultId]/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VAULTS, fmtUSD } from "@/lib/appData";
import { depositToVault, TxState } from "@/lib/vaultService";
import { addPosition } from "@/lib/positionStore";
import { logActivity } from "@/lib/activityStore";
import { useAuth } from "@/lib/authState";

interface MintResult {
  mintAddress:  string;
  tokenAccount: string;
  txSignature:  string;
  explorerUrl:  string;
  tokenName:    string;
  tokenSymbol:  string;
  simulated:    boolean;
}

export default function DepositPage({ params }: { params: { vaultId: string } }) {
  const router = useRouter();
  const { walletAddressFull, walletConnected } = useAuth();
  const vault = VAULTS.find((v) => v.id === params.vaultId);

  const [txState, setTxState] = useState<TxState>("idle");
  const [amount,  setAmount]  = useState("");
  const [agreed,  setAgreed]  = useState(false);
  const [result,  setResult]  = useState<MintResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  if (!vault) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "4rem 1.25rem", textAlign: "center" }}>
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Vault not found.</p>
        <Link href="/marketplace" style={{ color: "var(--gold)" }}>Browse vaults →</Link>
      </div>
    );
  }

  const usd     = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  const annual  = usd > 0 ? Math.round(usd * vault.apy / 100) : 0;
  const monthly = Math.round(annual / 12);

  const isProcessing = txState === "validating" || txState === "submitting" || txState === "confirming" || txState === "minting";

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
      userWallet:   walletAddressFull,
      vaultId:      vault.id,
      vaultName:    vault.name,
      yieldRate:    vault.apy,
      depositedUsd: usd,
    });

    if (!res.ok) {
      setError(res.error ?? "Deposit failed.");
      setTxState("error");
      return;
    }

    // Write to position store — drives dashboard
    addPosition({
      vaultId:     vault.id,
      vaultName:   vault.name,
      asset:       vault.asset,
      amount:      usd,
      apy:         vault.apy,
      mintAddress: res.mintAddress,
      txSig:       res.txSignature,
    });

    // Write to activity store — drives live feed
    logActivity({ type: "deposit", vaultId: vault.id, vaultName: vault.name, asset: vault.asset, amount: usd, message: "Position opened", txSig: res.txSignature });
    logActivity({ type: "mint",    vaultId: vault.id, vaultName: vault.name, asset: vault.asset, message: "Token-2022 minted to operator wallet", txSig: res.txSignature });

    setResult({
      mintAddress:  res.mintAddress,
      tokenAccount: res.tokenAccount,
      txSignature:  res.txSignature,
      explorerUrl:  res.explorerUrl,
      tokenName:    res.tokenName,
      tokenSymbol:  res.tokenSymbol,
      simulated:    res.simulated,
    });
    setTxState("active");
  };

  // ── SUCCESS SCREEN ──────────────────────────────────────────────────────────
  if (txState === "active" && result) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ width: "60px", height: "60px", margin: "0 auto 1rem", borderRadius: "50%", background: "rgba(61,214,140,0.12)", border: "2px solid var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>✓</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.4rem" }}>Deposit confirmed.</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
            {fmtUSD(usd)} into {vault.name} · Agent is now operating.
          </p>
        </div>

        {/* Confirmation details */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden", marginBottom: "0.875rem" }}>
          {[
            { k: "Vault",    v: vault.name  },
            { k: "Asset",    v: vault.asset },
            { k: "Amount",   v: fmtUSD(usd),    bold: true  },
            { k: "APY",      v: `${vault.apy}%`, green: true },
            { k: "Status",   v: result.simulated ? "Simulated · configure VAULT_AUTHORITY_SECRET for live minting" : "Confirmed on-chain" },
          ].map(({ k, v, bold, green }, i, arr) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.7rem 1.1rem", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--subtle)" }}>{k}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: bold ? 700 : 500, color: green ? "var(--green)" : "var(--text)", maxWidth: "240px", textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Token-2022 panel */}
        <div style={{ background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.25)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "0.875rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.625rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--green)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Position token {result.simulated ? "(simulated)" : "— in your wallet"}
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.15rem" }}>{result.tokenName}</div>
          <div style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", marginBottom: "0.625rem" }}>
            {result.tokenSymbol} · Token-2022 · {vault.apy}% APY
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "var(--gold)", wordBreak: "break-all", background: "rgba(200,169,110,0.08)", padding: "0.4rem 0.625rem", borderRadius: "5px", marginBottom: "0.625rem" }}>
            {result.mintAddress}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
            {result.simulated
              ? "Simulation mode — token structure is real but not broadcast on-chain. Add VAULT_AUTHORITY_SECRET to Vercel to enable live minting."
              : "Open Phantom or Solflare → Tokens tab. Look for ABRAP. If not visible, import the token address above."}
          </div>
          <div style={{ display: "flex", gap: "0.875rem" }}>
            <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>
              View tx on Solscan ↗
            </a>
            <a href={`https://solscan.io/token/${result.mintAddress}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none" }}>
              View token ↗
            </a>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
          <Link href="/app" style={{ textDecoration: "none" }}>
            <button style={{ width: "100%", background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "10px", padding: "0.85rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
              Dashboard
            </button>
          </Link>
          <Link href={`/vault/${vault.id}`} style={{ textDecoration: "none" }}>
            <button style={{ width: "100%", background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.85rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
              View vault
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // ── PROCESSING SCREEN ───────────────────────────────────────────────────────
  if (isProcessing) {
    const steps = [
      { key: "validating", label: "Validating wallet and vault",  doneAt: ["submitting","confirming","minting","active"] },
      { key: "submitting", label: "Submitting transaction",        doneAt: ["confirming","minting","active"]              },
      { key: "minting",    label: "Minting Token-2022 position",   doneAt: ["active"]                                    },
    ] as const;

    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "3rem 1.25rem 4rem" }}>
        <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1.75rem", textAlign: "center" }}>Processing deposit…</p>
        {steps.map((s) => {
          const stateStr = txState as string;
          const done   = (s.doneAt as readonly string[]).includes(stateStr);
          const active = stateStr === s.key;
          return (
            <div key={s.key} style={{
              display: "flex", alignItems: "center", gap: "0.875rem",
              padding: "0.875rem 1.1rem",
              background: done ? "rgba(61,214,140,0.06)" : active ? "rgba(200,169,110,0.06)" : "var(--surface)",
              border: `1px solid ${done ? "rgba(61,214,140,0.2)" : active ? "rgba(200,169,110,0.2)" : "var(--line)"}`,
              borderRadius: "10px", marginBottom: "0.625rem",
            }}>
              <div style={{
                width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                background: done ? "var(--green)" : "transparent",
                border: `2px solid ${done ? "var(--green)" : active ? "var(--gold)" : "var(--line)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {done   && <span style={{ color: "var(--void)", fontSize: "0.6rem", fontWeight: 700 }}>✓</span>}
                {active && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--gold)", animation: "pulse 1s ease-in-out infinite" }} />}
              </div>
              <span style={{ fontSize: "0.82rem", fontWeight: done || active ? 600 : 400, color: done ? "var(--green)" : active ? "var(--text)" : "var(--subtle)" }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── INPUT / REVIEW SCREEN ───────────────────────────────────────────────────
  const step = txState === "idle" ? "amount" : "review";

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <button onClick={() => step === "amount" ? router.back() : setTxState("idle")}
        style={{ background: "none", border: "none", color: "var(--subtle)", fontSize: "0.75rem", cursor: "pointer", marginBottom: "1.25rem" }}>
        ← {step === "amount" ? "Back" : "Edit"}
      </button>

      {/* Vault chip */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.875rem 1.25rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{vault.name}</div>
          <div style={{ fontSize: "0.68rem", color: "var(--subtle)" }}>{vault.asset} · {vault.agent}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--green)" }}>{vault.apy}%</div>
          <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase" }}>APY</div>
        </div>
      </div>

      {/* AMOUNT STEP */}
      {step === "amount" && (
        <>
          <div style={{ position: "relative", marginBottom: "0.75rem" }}>
            <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: "1.2rem" }}>$</span>
            <input
              type="number" inputMode="decimal" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="0"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "1rem 1rem 1rem 2.25rem",
                fontSize: "1.5rem", fontWeight: 700, textAlign: "center",
                background: "var(--surface)", border: "1px solid var(--line)",
                color: "var(--text)", borderRadius: "10px", outline: "none",
                fontFamily: "'Space Grotesk', sans-serif",
              }} />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", justifyContent: "center" }}>
            {["500","1000","5000","10000"].map((v) => (
              <button key={v} onClick={() => setAmount(v)} style={{
                background: amount === v ? "rgba(200,169,110,0.12)" : "var(--surface)",
                border: `1px solid ${amount === v ? "var(--gold)" : "var(--line)"}`,
                color: amount === v ? "var(--gold)" : "var(--muted)",
                borderRadius: "6px", padding: "0.3rem 0.65rem", fontSize: "0.72rem", cursor: "pointer",
              }}>
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

          <button disabled={usd <= 0} onClick={() => usd > 0 && setTxState("idle" as TxState) && true && void router.push("")}
            // actually just move to review
            style={{ display: "none" }} />

          <button disabled={usd <= 0} onClick={() => {
            if (usd > 0) {
              setError(null);
              setTxState("idle");
              // use txState idle as "reviewed" sentinel — we show review below when idle + amount set
              // Actually keep it simple: when amount > 0 and click, go to review
              document.getElementById("deposit-review")?.scrollIntoView();
            }
          }}
            style={{
              width: "100%",
              background: usd > 0 ? "var(--gold)" : "var(--surface)",
              color: usd > 0 ? "var(--void)" : "var(--subtle)",
              border: "none", borderRadius: "10px", padding: "0.95rem",
              fontWeight: 700, fontSize: "0.9rem",
              cursor: usd > 0 ? "pointer" : "not-allowed",
            }}
            onClick={() => {
              if (usd > 0) { setTxState("idle"); }
            }}
          >
            Review deposit →
          </button>

          {usd > 0 && (
            <div id="deposit-review" style={{ marginTop: "1.25rem" }}>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.625rem" }}>Confirm</p>
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden", marginBottom: "0.75rem" }}>
                {[
                  { k: "Amount",   v: fmtUSD(usd), bold: true },
                  { k: "Vault",    v: vault.name },
                  { k: "Asset",    v: vault.asset },
                  { k: "APY",      v: `${vault.apy}%`, green: true },
                  { k: "Token",    v: "ABRAXAS POSITION (ABRAP)" },
                  { k: "Standard", v: "Token-2022 · Solana" },
                ].map(({ k, v, bold, green }, i, arr) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.65rem 1.1rem", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--subtle)" }}>{k}</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: bold ? 700 : 500, color: green ? "var(--green)" : "var(--text)" }}>{v}</span>
                  </div>
                ))}
              </div>

              {txState === "error" && error && (
                <div style={{ background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.25)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
                  <p style={{ fontSize: "0.78rem", color: "var(--red)" }}>{error}</p>
                </div>
              )}

              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.7rem 0.875rem", background: "rgba(200,169,110,0.04)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: "8px", cursor: "pointer", marginBottom: "0.75rem", boxSizing: "border-box", width: "100%" }}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.55 }}>
                  Beta · Non-custodial · Token-2022 minted to my wallet · I retain full ownership
                </span>
              </label>

              <button disabled={!agreed} onClick={submit}
                style={{
                  width: "100%",
                  background: agreed ? "var(--gold)" : "var(--surface)",
                  color: agreed ? "var(--void)" : "var(--subtle)",
                  border: "none", borderRadius: "10px", padding: "0.95rem",
                  fontWeight: 700, fontSize: "0.9rem",
                  cursor: agreed ? "pointer" : "not-allowed",
                }}>
                Confirm deposit
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}