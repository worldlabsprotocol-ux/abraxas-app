// FILE: app/deposit/[vaultId]/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VAULTS, fmtUSD } from "@/lib/appData";
import { addPosition } from "@/lib/positionStore";
import { logActivity } from "@/lib/activityStore";
import { useAuth } from "@/lib/authState";

type Step = "amount" | "review" | "submitting" | "minting" | "done" | "error";

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

  const [step,    setStep]    = useState<Step>("amount");
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

  const usd      = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  const annual   = usd > 0 ? Math.round(usd * vault.apy / 100) : 0;
  const monthly  = Math.round(annual / 12);

  const submit = async () => {
    if (!walletConnected || !walletAddressFull) {
      setError("Connect your wallet to deposit.");
      setStep("error");
      return;
    }

    setStep("submitting");
    await new Promise((r) => setTimeout(r, 700));

    setStep("minting");
    try {
      const res = await fetch("/api/mint/position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet:   walletAddressFull,
          vaultId:      vault.id,
          vaultName:    vault.name,
          yieldRate:    vault.apy,
          depositedUsd: usd,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Mint failed.");
        setStep("error");
        return;
      }

      const r: MintResult = {
        mintAddress:  data.mintAddress,
        tokenAccount: data.tokenAccount,
        txSignature:  data.txSignature,
        explorerUrl:  data.explorerUrl,
        tokenName:    data.tokenName,
        tokenSymbol:  data.tokenSymbol,
        simulated:    data.simulated ?? true,
      };

      addPosition({
        vaultId:     vault.id,
        vaultName:   vault.name,
        asset:       vault.asset,
        amount:      usd,
        apy:         vault.apy,
        mintAddress: r.mintAddress,
        txSig:       r.txSignature,
      });
      logActivity({ type: "deposit", vaultId: vault.id, vaultName: vault.name, asset: vault.asset, amount: usd, message: "Position opened",                            txSig: r.txSignature });
      logActivity({ type: "mint",    vaultId: vault.id, vaultName: vault.name, asset: vault.asset,             message: "Token-2022 minted to operator wallet",       txSig: r.txSignature });

      setResult(r);
      setStep("done");
    } catch {
      setError("Network error — try again.");
      setStep("error");
    }
  };

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>

      <button
        onClick={() => step === "amount" ? router.back() : setStep("amount")}
        style={{ background: "none", border: "none", color: "var(--subtle)", fontSize: "0.75rem", cursor: "pointer", marginBottom: "1.25rem" }}>
        ← {step === "amount" ? "Back" : "Edit"}
      </button>

      {/* Vault chip — always visible */}
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

      {/* AMOUNT */}
      {step === "amount" && (
        <>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Step 2 of 2 — Amount</p>

          <div style={{ position: "relative", marginBottom: "0.75rem" }}>
            <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: "1.1rem" }}>$</span>
            <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
              style={{
                width: "100%", boxSizing: "border-box",
                paddingLeft: "2rem", padding: "1rem 1rem 1rem 2rem",
                fontSize: "1.5rem", fontWeight: 700, textAlign: "center",
                background: "var(--surface)", border: "1px solid var(--line)",
                color: "var(--text)", borderRadius: "10px", outline: "none",
                fontFamily: "'Space Grotesk', sans-serif",
              }} />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", justifyContent: "center" }}>
            {["500", "1000", "5000", "10000"].map((v) => (
              <button key={v} onClick={() => setAmount(v)}
                style={{
                  background: amount === v ? "rgba(200,169,110,0.12)" : "var(--surface)",
                  border: `1px solid ${amount === v ? "var(--gold)" : "var(--line)"}`,
                  color: amount === v ? "var(--gold)" : "var(--muted)",
                  borderRadius: "6px", padding: "0.35rem 0.7rem", fontSize: "0.72rem", cursor: "pointer",
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

          <button
            disabled={usd <= 0}
            onClick={() => setStep("review")}
            style={{
              width: "100%",
              background: usd > 0 ? "var(--gold)" : "var(--surface)",
              color: usd > 0 ? "var(--void)" : "var(--subtle)",
              border: "none", borderRadius: "10px", padding: "0.95rem",
              fontWeight: 700, fontSize: "0.9rem",
              cursor: usd > 0 ? "pointer" : "not-allowed",
            }}>
            Review deposit →
          </button>
        </>
      )}

      {/* REVIEW */}
      {step === "review" && (
        <>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.875rem" }}>Confirm deposit</p>

          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden", marginBottom: "1rem" }}>
            {[
              { k: "Amount",   v: fmtUSD(usd),                bold: true },
              { k: "Vault",    v: vault.name                              },
              { k: "Asset",    v: vault.asset                             },
              { k: "APY",      v: `${vault.apy}%`,            green: true },
              { k: "Agent",    v: vault.agent                             },
              { k: "Token",    v: "ABRAXAS POSITION (ABRAP)"              },
              { k: "Standard", v: "Token-2022 · Solana"                   },
            ].map(({ k, v, bold, green }, i, arr) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.7rem 1.1rem", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--subtle)" }}>{k}</span>
                <span style={{ fontSize: "0.78rem", fontWeight: bold ? 700 : 500, color: green ? "var(--green)" : "var(--text)" }}>{v}</span>
              </div>
            ))}
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.75rem 1rem", background: "rgba(200,169,110,0.04)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: "8px", cursor: "pointer", marginBottom: "1rem", boxSizing: "border-box", width: "100%" }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.55, wordBreak: "break-word" }}>
              Beta · Non-custodial · Token-2022 minted to my wallet · I retain full ownership
            </span>
          </label>

          <button
            disabled={!agreed}
            onClick={submit}
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
        </>
      )}

      {/* PROCESSING — submitting + minting visible */}
      {(step === "submitting" || step === "minting") && (
        <div style={{ padding: "1.5rem 0" }}>
          <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1.5rem", textAlign: "center" }}>Processing…</p>
          {[
            { key: "submit",   label: "Submitting transaction",       done: (step as string) === "minting" || (step as string) === "done", active: (step as string) === "submitting" },
            { key: "mint",     label: "Minting Token-2022 position",  done: (step as string) === "done", active: (step as string) === "minting" },
            { key: "activate", label: "Activating agent on vault",    done: (step as string) === "done", active: false },
          ].map((s) => (
            <div key={s.key} style={{
              display: "flex", alignItems: "center", gap: "0.875rem",
              padding: "0.875rem 1.1rem",
              background: s.done ? "rgba(61,214,140,0.06)" : s.active ? "rgba(200,169,110,0.06)" : "var(--surface)",
              border: `1px solid ${s.done ? "rgba(61,214,140,0.2)" : s.active ? "rgba(200,169,110,0.2)" : "var(--line)"}`,
              borderRadius: "10px", marginBottom: "0.625rem",
            }}>
              <div style={{
                width: "20px", height: "20px", borderRadius: "50%",
                background: s.done ? "var(--green)" : "transparent",
                border: `2px solid ${s.done ? "var(--green)" : s.active ? "var(--gold)" : "var(--line)"}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {s.done && <span style={{ color: "var(--void)", fontSize: "0.62rem", fontWeight: 700 }}>✓</span>}
                {s.active && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--gold)", animation: "pulse 1s ease-in-out infinite" }} />}
              </div>
              <span style={{ fontSize: "0.82rem", fontWeight: s.done || s.active ? 600 : 400, color: s.done ? "var(--green)" : s.active ? "var(--text)" : "var(--subtle)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* DONE — success with proof */}
      {step === "done" && result && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ width: "56px", height: "56px", margin: "0 auto 1rem", borderRadius: "50%", background: "rgba(61,214,140,0.12)", border: "2px solid var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>✓</div>
            <h2 style={{ fontWeight: 700, fontSize: "1.4rem", marginBottom: "0.4rem" }}>Position activated.</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
              {fmtUSD(usd)} into {vault.name} · {vault.agent} is now operating.
            </p>
          </div>

          {/* Token panel — UI matches what's in the wallet */}
          <div style={{ background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.25)", borderRadius: "12px", padding: "1.1rem 1.25rem", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--green)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {result.simulated ? "Position Token (simulation mode)" : "Position Token in your wallet"}
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.2rem" }}>{result.tokenName}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.75rem", fontFamily: "'JetBrains Mono', monospace" }}>
              Symbol: {result.tokenSymbol} · Token-2022 · {vault.apy}% APY
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.62rem", color: "var(--gold)", wordBreak: "break-all", background: "rgba(200,169,110,0.08)", padding: "0.5rem 0.75rem", borderRadius: "6px", marginBottom: "0.75rem" }}>
              {result.mintAddress}
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>
                View tx on Solscan ↗
              </a>
              <a href={`https://solscan.io/token/${result.mintAddress}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none" }}>
                View token ↗
              </a>
            </div>
          </div>

          {!result.simulated && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.55 }}>
                Open Phantom or Solflare → check your tokens. The position appears as <strong style={{ color: "var(--text)" }}>{result.tokenSymbol}</strong>.
              </p>
            </div>
          )}

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
      )}

      {/* ERROR */}
      {step === "error" && (
        <div>
          <div style={{ background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.25)", borderRadius: "10px", padding: "1rem 1.25rem", marginBottom: "1rem" }}>
            <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#f26b6b", marginBottom: "0.4rem" }}>Something went wrong</p>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{error}</p>
          </div>
          <button
            onClick={() => { setError(null); setStep("review"); }}
            style={{ width: "100%", background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "10px", padding: "0.95rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}