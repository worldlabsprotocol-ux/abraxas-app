"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/authState";
import { usePortfolioData } from "@/lib/usePortfolioData";
import { Button } from "@/components/Button";
import { WalletGate } from "@/components/WalletGate";
import { formatCurrency } from "@/lib/utils";
import { mockVaults } from "@/lib/mockData";

/** Derives a stable operator ID from wallet address. */
function deriveOperatorId(wallet: string): string {
  let hash = 0;
  for (let i = 0; i < wallet.length; i++) {
    hash = ((hash << 5) - hash) + wallet.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, "0");
  return `OPR-${hex}`;
}

/** Derives operator tier from portfolio value */
function deriveTier(portfolioValue: number): { label: string; color: string; next: string } {
  if (portfolioValue >= 100_000) return { label: "Sovereign", color: "var(--gold)", next: "" };
  if (portfolioValue >= 25_000)  return { label: "Architect", color: "#a78bfa", next: "Sovereign at $100K" };
  if (portfolioValue >= 5_000)   return { label: "Operator",  color: "var(--green)", next: "Architect at $25K" };
  return { label: "Initiate", color: "var(--muted)", next: "Operator at $5K" };
}

function OperatorContent() {
  const router = useRouter();
  const { walletAddress, walletConnected, user } = useAuth();
  const portfolio = usePortfolioData();
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const operatorId = walletAddress
    ? deriveOperatorId(walletAddress.replace("…", ""))
    : "OPR-??????";

  const tier = deriveTier(portfolio.portfolioValue);

  // Entrance reveal animation
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(t);
  }, []);

  const shareText = `I'm an Abraxas operator.\n\nOperator ID: ${operatorId}\nTier: ${tier.label}\nPortfolio: ${formatCurrency(portfolio.portfolioValue)}\n\nOperating real-world assets on Solana.\n\nabraxas.app`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShareX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const activeVaults = portfolio.vaultPositions.filter((p) => p.tvl > 0);

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "3rem 1.5rem" }}>

      {/* Operator identity card */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--surface), rgba(200,169,110,0.05))",
          border: "1px solid rgba(200,169,110,0.25)",
          borderRadius: "20px",
          padding: "2.5rem",
          marginBottom: "1.5rem",
          position: "relative",
          overflow: "hidden",
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Top glow */}
        <div style={{ position: "absolute", top: 0, left: "25%", right: "25%", height: "1px", background: "linear-gradient(90deg, transparent, var(--gold), transparent)" }} />
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "200px", height: "80px", background: "radial-gradient(ellipse, rgba(200,169,110,0.08), transparent 70%)", pointerEvents: "none" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>
              Abraxas Operator
            </p>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "1.6rem", fontWeight: 700, color: "var(--gold)", letterSpacing: "0.04em" }}>
              {operatorId}
            </div>
          </div>
          <div style={{
            background: `${tier.color}15`,
            border: `1px solid ${tier.color}40`,
            borderRadius: "8px",
            padding: "0.4rem 0.875rem",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: tier.color,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            alignSelf: "flex-start",
          }}>
            {tier.label}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { label: "Portfolio Value", value: portfolio.loading ? "…" : formatCurrency(portfolio.portfolioValue) },
            { label: "Yield Generated", value: portfolio.loading ? "…" : formatCurrency(portfolio.yieldGenerated), color: "var(--green)" },
            { label: "Active Positions", value: String(activeVaults.length) },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: s.color ?? "var(--text)", marginBottom: "0.2rem" }}>
                {s.value}
              </div>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Vault positions */}
        {activeVaults.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>
              Operating Positions
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {activeVaults.slice(0, 3).map((pos) => {
                const vault = mockVaults.find((v) => v.id === pos.vaultId);
                return (
                  <div key={pos.vaultId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.875rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", cursor: "pointer" }}
                    onClick={() => router.push(`/vault/${pos.vaultId}`)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{pos.vaultName}</div>
                        <div style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>{vault?.assetClass} · {pos.yieldRate}% APY</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{formatCurrency(pos.tvl)}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--green)" }}>+{formatCurrency(pos.annualYield / 12)}/mo</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Wallet */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.7rem" }}>
          <span style={{ color: "var(--subtle)" }}>Wallet</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--gold)" }}>{walletAddress}</span>
        </div>

        {/* Tier progress */}
        {tier.next && (
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>
              Next tier: <span style={{ color: "var(--text)" }}>{tier.next}</span>
            </p>
          </div>
        )}
      </div>

      {/* Share section */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "14px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s",
      }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>
          Share your operator status
        </p>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: "1.25rem" }}>
          Your operator ID is public. Share it on X to let your community watch your vaults operate.
        </p>
        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
          <button
            onClick={handleShareX}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              background: "#000000",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#ffffff",
              borderRadius: "8px",
              padding: "0.625rem 1.25rem",
              fontSize: "0.78rem",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              cursor: "pointer",
              flex: 1,
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Post on X
          </button>
          <button
            onClick={handleCopy}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: copied ? "var(--green)" : "var(--muted)",
              borderRadius: "8px",
              padding: "0.625rem 1.25rem",
              fontSize: "0.78rem",
              fontFamily: "'Space Grotesk', sans-serif",
              cursor: "pointer",
              flex: 1,
              justifyContent: "center",
              transition: "color 0.2s",
            }}
          >
            {copied ? "✓ Copied" : "Copy text"}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem",
        opacity: revealed ? 1 : 0,
        transition: "opacity 0.5s ease 0.25s",
      }}>
        <Button size="lg" fullWidth onClick={() => router.push("/app")}>Dashboard</Button>
        <Button size="lg" fullWidth variant="ghost" onClick={() => router.push("/marketplace")}>+ New Position</Button>
      </div>

      <p style={{ fontSize: "0.62rem", color: "var(--subtle)", textAlign: "center", marginTop: "1.5rem" }}>
        Your operator ID is derived from your wallet address and is permanent.
      </p>
    </div>
  );
}

export default function OperatorPage() {
  return (
    <WalletGate>
      <OperatorContent />
    </WalletGate>
  );
}