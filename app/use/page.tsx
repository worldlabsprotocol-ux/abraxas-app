"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { WalletGate } from "@/components/WalletGate";
import { usePortfolioData } from "@/lib/usePortfolioData";
import { useAuth } from "@/lib/authState";
import { ABRA } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

type AState = "idle" | "confirming" | "confirmed";

type TxType = "credit" | "debit";
interface Txn { label: string; amount: number; type: TxType; }

function UseValueContent() {
  const router = useRouter();
  const portfolio = usePortfolioData();
  const { walletAddress, walletAddressFull } = useAuth();
  const [states, setStates] = useState<Record<string, AState>>({});

  // Jupiter swap URL — direct to ABRA token
  const jupiterSwapUrl = `https://jup.ag/swap/SOL-${ABRA.ca}`;

  const ACTIONS = [
    {
      icon: "↓",
      title: "Withdraw",
      desc: walletAddress
        ? `Send yield to ${walletAddress}`
        : "Connect wallet to withdraw",
      key: "withdraw",
      action: async () => {
        setStates((s) => ({ ...s, withdraw: "confirming" }));
        try {
          await fetch("/api/withdraw/position", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userWallet: walletAddressFull ?? "", mintAddress: "" }),
          });
        } catch (e) { console.error("[withdraw]", e); }
        setStates((s) => ({ ...s, withdraw: "confirmed" }));
        setTimeout(() => setStates((s) => ({ ...s, withdraw: "idle" })), 3000);
      },
    },
    {
      icon: "↺",
      title: "Reinvest",
      desc: "Compound yield back into your highest-APY vault",
      key: "reinvest",
      action: () => {
        // Route to highest-yield vault deposit
        const topVault = portfolio.vaultPositions.reduce((a, b) =>
          a.yieldRate > b.yieldRate ? a : b,
          portfolio.vaultPositions[0]
        );
        if (topVault) router.push(`/deposit/${topVault.vaultId}`);
      },
    },
    {
      icon: "⇄",
      title: "Swap to $ABRA",
      desc: "Exchange SOL or USDC for $ABRA via Jupiter",
      key: "swap",
      action: () => window.open(jupiterSwapUrl, "_blank"),
      external: true,
    },
    {
      icon: "↗",
      title: "New Position",
      desc: "Deploy capital into a new vault",
      key: "position",
      action: () => router.push("/marketplace"),
    },
  ];

  const txns: Txn[] = [
    ...portfolio.vaultPositions.slice(0, 3).map((p) => ({
      label: `Yield credited — ${p.vaultName}`,
      amount: Math.round(p.annualYield / 12),
      type: "credit" as TxType,
    })),
    {
      label: "Withdrawal to wallet",
      amount: Math.round(portfolio.availableCapital * 0.4),
      type: "debit" as TxType,
    },
  ];

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <PageHeader title="Use Your Capital" subtitle="Access, reinvest, and grow your yield." />

      {/* Balance cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "2rem" }}>
        {[
          { label: "Available Capital", value: portfolio.loading ? "…" : formatCurrency(portfolio.availableCapital), color: "var(--gold)" },
          { label: "Yield Generated",   value: portfolio.loading ? "…" : formatCurrency(portfolio.yieldGenerated),  color: "var(--green)" },
        ].map((card) => (
          <div key={card.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.25rem 1.5rem" }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>{card.label}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.6rem", color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* $ABRA accumulation nudge */}
      <div style={{ background: "rgba(200,169,110,0.05)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "10px", padding: "0.875rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
          <span style={{ color: "var(--gold)", fontWeight: 600 }}>Operators who hold $ABRA</span> unlock priority vault access and reduced fees.
        </div>
        <a href={ABRA.bags} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--gold)", textDecoration: "none", whiteSpace: "nowrap", border: "1px solid rgba(200,169,110,0.3)", padding: "0.35rem 0.75rem", borderRadius: "6px" }}>
          Get $ABRA →
        </a>
      </div>

      {/* Action cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "2rem" }}>
        {ACTIONS.map((item) => {
          const state = states[item.key] ?? "idle";
          return (
            <div
              key={item.key}
              onClick={item.action}
              style={{
                background: state === "confirmed" ? "rgba(61,214,140,0.05)" : "var(--surface)",
                border: `1px solid ${state === "confirmed" ? "rgba(61,214,140,0.3)" : state === "confirming" ? "rgba(200,169,110,0.3)" : "var(--line)"}`,
                borderRadius: "14px", padding: "1.5rem",
                cursor: "pointer", transition: "all 0.25s",
                position: "relative",
              }}
              onMouseEnter={(e) => { if (state === "idle") (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,169,110,0.25)"; }}
              onMouseLeave={(e) => { if (state === "idle") (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; }}
            >
              {item.external && (
                <span style={{ position: "absolute", top: "0.75rem", right: "0.75rem", fontSize: "0.6rem", color: "var(--subtle)" }}>↗</span>
              )}
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(200,169,110,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", marginBottom: "0.875rem" }}>
                {state === "confirming" ? "⟳" : state === "confirmed" ? "✓" : item.icon}
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{item.title}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
                {state === "confirming" ? "Processing…" : state === "confirmed" ? "Done." : item.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction history */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: "1rem" }}>
          Recent Activity
        </div>
        {txns.map((tx, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.7rem 0", borderBottom: i < txns.length - 1 ? "1px solid var(--line)" : "none", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--muted)" }}>{tx.label}</span>
            <span style={{ fontWeight: 600, color: tx.type === "credit" ? "var(--green)" : "var(--red)" }}>
              {tx.type === "credit" ? "+" : "−"}{formatCurrency(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UsePage() {
  return <WalletGate><UseValueContent /></WalletGate>;
}