"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authState";
import { usePortfolioData, VAULT_YIELD_RATES } from "@/lib/usePortfolioData";
import { mockVaults, mockAgents } from "@/lib/mockData";
import { Button } from "@/components/Button";
import { WalletGate } from "@/components/WalletGate";
import { VaultExplainer } from "@/components/VaultExplainer";
import { formatCurrency } from "@/lib/utils";

type Step = "input" | "preview" | "minting" | "done";

interface MintResult {
  mintAddress: string;
  tokenAccount: string;
  txSignature: string | null;
  explorerUrl: string | null;
  demo?: boolean;
}

function DepositContent({ params }: { params: { vaultId: string } }) {
  const { vaultId } = params;
  const router = useRouter();
  const { walletAddress, walletAddressFull } = useAuth();
  const portfolio = usePortfolioData();

  const vault   = mockVaults.find((v) => v.id === vaultId);
  const agent   = mockAgents.find((a) => a.id === vault?.agentId);
  const rate    = VAULT_YIELD_RATES[vaultId] ?? 9.0;
  const pos     = portfolio.vaultPositions.find((p) => p.vaultId === vaultId);

  const [step,      setStep]      = useState<Step>("input");
  const [amount,    setAmount]    = useState("");
  const [agreed,    setAgreed]    = useState(false);
  const [result,    setResult]    = useState<MintResult | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  const usd      = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  const annual   = usd > 0 ? Math.round(usd * rate / 100) : 0;
  const monthly  = Math.round(annual / 12);

  const confirm = async () => {
    if (!walletAddressFull || !vault) return;
    setStep("minting");
    setMintError(null);
    try {
      const res  = await fetch("/api/mint/position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userWallet: walletAddressFull, vaultId, vaultName: vault.name, yieldRate: rate, depositedUsd: usd }),
      });
      const data = await res.json();
      if (!data.ok) { setMintError(data.error ?? "Mint failed"); setStep("preview"); return; }
      setResult({ mintAddress: data.mintAddress, tokenAccount: data.tokenAccount, txSignature: data.txSignature, explorerUrl: data.explorerUrl, demo: data.demo });
      setStep("done");
    } catch {
      setMintError("Network error — please try again.");
      setStep("preview");
    }
  };

  if (!vault) return (
    <div style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
      <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Vault not found.</p>
      <Button onClick={() => router.push("/marketplace")}>Browse Vaults</Button>
    </div>
  );

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2rem 1rem", width: "100%", boxSizing: "border-box" }}>
      {step !== "done" && (
        <button onClick={() => step === "input" ? router.back() : setStep("input")}
          style={{ fontSize: "0.75rem", color: "var(--subtle)", background: "none", border: "none", cursor: "pointer", marginBottom: "1.5rem" }}>
          ← {step === "input" ? "Back" : "Edit"}
        </button>
      )}

      {/* Vault chip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.875rem 1.25rem", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{vault.name}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--subtle)", marginTop: "0.15rem" }}>{vault.assetClass} · {agent?.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--green)" }}>{rate}%</div>
          <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase" }}>APY</div>
        </div>
      </div>

      {/* INPUT */}
      {step === "input" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: "1.1rem", fontWeight: 300 }}>$</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
              style={{ paddingLeft: "2rem", fontSize: "1.5rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, textAlign: "center" }} />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            {["500","1000","5000","10000"].map((v) => (
              <button key={v} onClick={() => setAmount(v)} style={{ background: amount === v ? "rgba(200,169,110,0.12)" : "var(--surface)", border: `1px solid ${amount === v ? "var(--gold)" : "var(--line)"}`, color: amount === v ? "var(--gold)" : "var(--muted)", borderRadius: "6px", padding: "0.3rem 0.65rem", fontSize: "0.72rem", cursor: "pointer", transition: "all 0.15s" }}>
                ${parseInt(v).toLocaleString()}
              </button>
            ))}
          </div>

          {usd > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.18)", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--green)" }}>{formatCurrency(annual)}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>per year</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--green)" }}>{formatCurrency(monthly)}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>per month</div>
              </div>
            </div>
          )}

          <Button size="lg" fullWidth disabled={usd <= 0} onClick={() => setStep("preview")}>
            Continue
          </Button>

          {/* FAQ — answers "why do I need to deposit after minting?" */}
          <div style={{ marginTop: "1.5rem" }}>
            <VaultExplainer />
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {step === "preview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
            {[
              { label: "Depositing",    value: formatCurrency(usd),        bold: true },
              { label: "APY",           value: `${rate}%`,                 green: true },
              { label: "Yield / year",  value: formatCurrency(annual),     green: true },
              { label: "Agent",         value: agent?.name ?? "AGENT-001", mono: true },
              { label: "Standard",      value: "Token-2022 · Solana" },
              { label: "Custody",       value: "Non-custodial" },
            ].map(({ label, value, bold, green, mono }, i, arr) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1.25rem", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--subtle)" }}>{label}</span>
                <span style={{ fontSize: mono ? "0.7rem" : "0.8rem", fontWeight: bold ? 700 : 500, color: green ? "var(--green)" : "var(--text)", fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit" }}>{value}</span>
              </div>
            ))}
          </div>

          {mintError && (
            <div style={{ padding: "0.75rem 1rem", background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.2)", borderRadius: "8px" }}>
              <p style={{ fontSize: "0.75rem", color: "#f26b6b", margin: 0 }}>{mintError}</p>
            </div>
          )}

          {/* Compact checkbox */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--line)" }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.5 }}>
              Beta · Non-custodial · Token-2022 minted to my wallet · Yields are estimates
            </span>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.625rem" }}>
            <Button size="lg" variant="ghost" onClick={() => setStep("input")}>Edit</Button>
            <Button size="lg" fullWidth disabled={!agreed} onClick={confirm}>Confirm Deposit</Button>
          </div>
        </div>
      )}

      {/* MINTING */}
      {step === "minting" && (
        <div style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem", animation: "pulse 1s ease-in-out infinite" }}>◎</div>
          <p style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.5rem" }}>Minting position…</p>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
            Token-2022 · {vault.name} · {rate}% APY
          </p>
        </div>
      )}

      {/* DONE */}
      {step === "done" && result && (
        <div style={{ maxWidth: "460px", margin: "0 auto", textAlign: "center", padding: "1rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>◎</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.4rem", marginBottom: "0.5rem" }}>
            Position activated.
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "1.25rem" }}>
            {formatCurrency(usd)} into {vault.name}.<br />
            {agent?.name} is now operating your position.
          </p>

          {/* Mint receipt — full width, no overflow */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.25rem", textAlign: "left", width: "100%", overflow: "hidden" }}>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>
              {result.demo ? "Position Token · Demo" : "Position Token · On-Chain"}
            </p>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "var(--gold)", wordBreak: "break-all", lineHeight: 1.6, marginBottom: "0.625rem" }}>
              {result.mintAddress}
            </div>
            {result.explorerUrl ? (
              <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                View on Solscan ↗
              </a>
            ) : (
              <p style={{ fontSize: "0.68rem", color: "var(--subtle)" }}>
                Add VAULT_AUTHORITY_SECRET to Vercel to enable live on-chain minting.
              </p>
            )}
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(61,214,140,0.08)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: "8px", padding: "0.4rem 0.875rem", marginBottom: "1.5rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.72rem", color: "var(--green)", fontWeight: 600 }}>Operating</span>
          </div>

          <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center" }}>
            <Button size="lg" onClick={() => router.push("/operator")}>My Profile</Button>
            <Button size="lg" variant="ghost" onClick={() => router.push(`/vault/${vaultId}`)}>View Vault</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DepositPage({ params }: { params: { vaultId: string } }) {
  return <WalletGate><DepositContent params={params} /></WalletGate>;
}