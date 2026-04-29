"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authState";
import { usePortfolioData, VAULT_YIELD_RATES } from "@/lib/usePortfolioData";
import { mockVaults, mockAgents } from "@/lib/mockData";
import { Button } from "@/components/Button";
import { WalletGate } from "@/components/WalletGate";
import { formatCurrency } from "@/lib/utils";

type DepositState = "input" | "preview" | "confirming" | "minting" | "done";

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
  const { walletAddress } = useAuth();
  const portfolio = usePortfolioData();

  const vault = mockVaults.find((v) => v.id === vaultId);
  const agent = mockAgents.find((a) => a.id === vault?.agentId);
  const yieldRate = VAULT_YIELD_RATES[vaultId] ?? 9.0;
  const vaultPosition = portfolio.vaultPositions.find((p) => p.vaultId === vaultId);

  const [step, setStep] = useState<DepositState>("input");
  const [amount, setAmount] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  const parsed = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  const projectedAnnual  = parsed > 0 ? Math.round(parsed * yieldRate / 100) : 0;
  const projectedMonthly = Math.round(projectedAnnual / 12);

  const handleConfirm = async () => {
    if (!walletAddress || !vault) return;
    setStep("confirming");

    // Brief pause to show confirming state
    await new Promise((r) => setTimeout(r, 800));
    setStep("minting");

    try {
      const res = await fetch("/api/mint/position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: walletAddress,
          vaultId,
          vaultName: vault.name,
          yieldRate,
          depositedUsd: parsed,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMintError(data.error ?? "Minting failed");
        setStep("preview");
        return;
      }

      setMintResult({
        mintAddress: data.mintAddress,
        tokenAccount: data.tokenAccount,
        txSignature: data.txSignature,
        explorerUrl: data.explorerUrl,
        demo: data.demo,
      });

      setStep("done");
    } catch (err) {
      console.error("[deposit/confirm]", err);
      setMintError("Network error — please try again.");
      setStep("preview");
    }
  };

  if (!vault) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Vault not found.</p>
        <Button onClick={() => router.push("/marketplace")}>Browse Vaults</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <button
        onClick={() => step === "input" ? router.back() : setStep("input")}
        style={{ fontSize: "0.75rem", color: "var(--subtle)", background: "none", border: "none", cursor: "pointer", marginBottom: "1.5rem" }}
      >
        ← {step === "input" ? "Back" : "Edit amount"}
      </button>

      {/* Vault header */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.2rem" }}>{vault.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--subtle)" }}>{vault.assetClass}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--green)" }}>{yieldRate}%</div>
            <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--subtle)" }}>APY</div>
          </div>
        </div>
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--line)", display: "flex", gap: "1.5rem", fontSize: "0.72rem", flexWrap: "wrap" }}>
          <div><span style={{ color: "var(--subtle)" }}>Agent: </span><span style={{ color: "var(--gold)", fontFamily: "'JetBrains Mono', monospace" }}>{agent?.name}</span></div>
          <div><span style={{ color: "var(--subtle)" }}>TVL: </span><span>{formatCurrency(vaultPosition?.tvl ?? vault.tvl)}</span></div>
          <div><span style={{ color: "var(--subtle)" }}>Defense: </span><span style={{ color: "var(--green)" }}>Active</span></div>
        </div>
      </div>

      {/* STEP: INPUT */}
      {step === "input" && (
        <>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>
              Deposit Amount (USD)
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: "1rem" }}>$</span>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="0"
                style={{ paddingLeft: "2rem", fontSize: "1.25rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {["500", "1000", "5000", "10000"].map((v) => (
              <button key={v} onClick={() => setAmount(v)}
                style={{ background: amount === v ? "rgba(200,169,110,0.1)" : "var(--surface)", border: `1px solid ${amount === v ? "var(--gold)" : "var(--line)"}`, color: amount === v ? "var(--gold)" : "var(--muted)", borderRadius: "6px", padding: "0.35rem 0.75rem", fontSize: "0.75rem", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.15s" }}>
                ${parseInt(v).toLocaleString()}
              </button>
            ))}
          </div>

          {parsed > 0 && (
            <div style={{ background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>Projected Returns</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "var(--green)" }}>{formatCurrency(projectedAnnual)}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--subtle)" }}>per year</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "var(--green)" }}>{formatCurrency(projectedMonthly)}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--subtle)" }}>per month</div>
                </div>
              </div>
              <p style={{ fontSize: "0.68rem", color: "var(--subtle)", marginTop: "0.75rem" }}>Based on {yieldRate}% APY · Projections are estimates.</p>
            </div>
          )}

          <Button size="lg" fullWidth disabled={parsed <= 0} onClick={() => setStep("preview")}>
            Review Deposit
          </Button>
        </>
      )}

      {/* STEP: PREVIEW */}
      {step === "preview" && (
        <>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.25rem" }}>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1rem" }}>Confirm Deposit</p>
            {[
              { label: "Vault",          value: vault.name },
              { label: "Amount",         value: formatCurrency(parsed), bold: true },
              { label: "APY",            value: `${yieldRate}%`, color: "var(--green)" },
              { label: "Projected/year", value: formatCurrency(projectedAnnual), color: "var(--green)" },
              { label: "Agent",          value: agent?.name ?? `AGENT-001`, mono: true },
              { label: "Your wallet",    value: walletAddress ?? "Connected", mono: true },
              { label: "Token Standard", value: "Token-2022 (Solana)" },
              { label: "Position token", value: "Minted to your wallet on confirm" },
              { label: "Custody",        value: "Non-custodial" },
            ].map(({ label, value, bold, color, mono }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--subtle)" }}>{label}</span>
                <span style={{ fontSize: mono ? "0.68rem" : "0.78rem", fontWeight: bold ? 700 : 500, color: color ?? "var(--text)", fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit" }}>{value}</span>
              </div>
            ))}
          </div>

          {mintError && (
            <div style={{ padding: "0.875rem 1rem", background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.2)", borderRadius: "8px", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.75rem", color: "#f26b6b" }}>{mintError}</p>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1.5rem", padding: "1rem", background: "rgba(107,140,255,0.04)", border: "1px solid rgba(107,140,255,0.12)", borderRadius: "10px" }}>
            <input type="checkbox" id="agree" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: "2px", flexShrink: 0 }} />
            <label htmlFor="agree" style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.65, cursor: "pointer" }}>
              I understand this is a beta product. Confirming will mint a real Token-2022 position token to my connected wallet on Solana. Non-custodial — I retain full ownership of underlying assets. Projected yields are estimates.
            </label>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button size="lg" variant="ghost" onClick={() => setStep("input")}>Edit</Button>
            <Button size="lg" fullWidth disabled={!agreed} onClick={handleConfirm}>
              Confirm &amp; Mint Position
            </Button>
          </div>
        </>
      )}

      {/* STEP: CONFIRMING */}
      {step === "confirming" && (
        <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⟳</div>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Preparing transaction…</p>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Assigning agent, building Token-2022 position.</p>
        </div>
      )}

      {/* STEP: MINTING */}
      {step === "minting" && (
        <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem", animation: "pulse 1s ease-in-out infinite" }}>◎</div>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Minting position token…</p>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
            Creating Token-2022 mint on Solana.
          </p>
          <p style={{ fontSize: "0.68rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono', monospace" }}>
            TOKEN-2022 · {vault.name} · {yieldRate}% APY
          </p>
        </div>
      )}

      {/* STEP: DONE */}
      {step === "done" && mintResult && (
        <div style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1.25rem" }}>◎</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            Position activated.
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "0.5rem" }}>
            <strong style={{ color: "var(--text)" }}>{formatCurrency(parsed)}</strong> deposited into {vault.name}.
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            {agent?.name} is now monitoring your position.
          </p>

          {/* Token-2022 mint confirmation */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem", textAlign: "left" }}>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.875rem" }}>
              {mintResult.demo ? "Position Token (Demo)" : "Position Token — Minted On-Chain"}
            </p>
            {[
              { label: "Mint Address",   value: mintResult.mintAddress },
              { label: "Token Account",  value: mintResult.tokenAccount.slice(0, 20) + "…" },
              { label: "Token Standard", value: "Token-2022 (Solana)" },
              { label: "Status",         value: mintResult.demo ? "Demo mode — configure VAULT_AUTHORITY_SECRET" : "Confirmed on-chain" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--line)", fontSize: "0.75rem" }}>
                <span style={{ color: "var(--subtle)" }}>{label}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--gold)", fontSize: "0.68rem", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
              </div>
            ))}
          </div>

          {mintResult.explorerUrl && (
            <a href={mintResult.explorerUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", fontSize: "0.75rem", color: "var(--gold)", textDecoration: "none", marginBottom: "1.5rem", fontFamily: "'JetBrains Mono', monospace" }}>
              View on Solscan ↗
            </a>
          )}

          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(61,214,140,0.08)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: "8px", padding: "0.5rem 1rem", marginBottom: "2rem" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.75rem", color: "var(--green)", fontWeight: 600 }}>Operating</span>
          </div>

          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            You are now an Abraxas operator.<br />Your position token lives in your wallet.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Button size="lg" onClick={() => router.push("/operator")}>View Operator Profile</Button>
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