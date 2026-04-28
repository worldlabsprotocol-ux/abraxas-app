"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { WalletGate } from "@/components/WalletGate";
import { userStats } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";

type ActionState = "idle" | "confirming" | "confirmed";

function useDrift(base: number, noise: number, ms = 9000) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const t = setInterval(() => setVal(base + (Math.random() * 2 - 1) * noise), ms);
    return () => clearInterval(t);
  }, [base, noise, ms]);
  return Math.round(val);
}

const ACTIONS = [
  { icon: "↓", title: "Withdraw", desc: "Transfer capital to your connected wallet.", key: "withdraw" },
  { icon: "↺", title: "Reinvest", desc: "Compound yield back into active vault positions.", key: "reinvest" },
  { icon: "⇄", title: "Swap", desc: "Exchange capital for $ABRA or supported tokens.", key: "swap" },
  { icon: "↗", title: "New Position", desc: "Deploy capital to a vault.", key: "position", href: "/marketplace" },
] as const;

function UseValueContent() {
  const router = useRouter();
  const [actionState, setActionState] = useState<Record<string, ActionState>>({});
  const capital = useDrift(userStats.availableCapital, 14, 10000);
  const yieldVal = useDrift(userStats.yieldGenerated, 9, 12000);

  const handleAction = (key: string, href?: string) => {
    if (href) { router.push(href); return; }
    setActionState((s) => ({ ...s, [key]: "confirming" }));
    setTimeout(() => {
      setActionState((s) => ({ ...s, [key]: "confirmed" }));
      setTimeout(() => setActionState((s) => ({ ...s, [key]: "idle" })), 2500);
    }, 1200);
  };

  const recentTxns = [
    { label: "Yield credited — VAULT-490", amount: 2100, type: "credit" as const },
    { label: "Distribution — VAULT-491", amount: 840, type: "credit" as const },
    { label: "Yield credited — VAULT-491", amount: 8400, type: "credit" as const },
    { label: "Withdrawal to wallet", amount: 3200, type: "debit" as const },
  ];

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <PageHeader title="Use Your Capital" subtitle="Access yield from your vault positions." />

      {/* Balances */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "2rem" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.25rem 1.5rem" }}>
          <div style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>
            Available Capital
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.6rem", color: "var(--gold)", transition: "all 0.5s" }}>
            {formatCurrency(capital)}
          </div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.25rem 1.5rem" }}>
          <div style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>
            Yield Generated
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.6rem", color: "var(--green)", transition: "all 0.5s" }}>
            {formatCurrency(yieldVal)}
          </div>
        </div>
      </div>

      {/* Action cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "2rem" }}>
        {ACTIONS.map((item) => {
          const state = actionState[item.key] ?? "idle";
          return (
            <div
              key={item.key}
              onClick={() => handleAction(item.key, "href" in item ? item.href : undefined)}
              style={{
                background: state === "confirmed" ? "rgba(61,214,140,0.06)" : "var(--surface)",
                border: `1px solid ${state === "confirmed" ? "rgba(61,214,140,0.3)" : state === "confirming" ? "rgba(200,169,110,0.3)" : "var(--line)"}`,
                borderRadius: "14px",
                padding: "1.5rem",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              <div style={{
                width: "34px", height: "34px", borderRadius: "8px",
                background: "rgba(200,169,110,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", marginBottom: "0.875rem",
              }}>
                {state === "confirming" ? "⟳" : state === "confirmed" ? "✓" : item.icon}
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{item.title}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>
                {state === "confirming" ? "Processing…" : state === "confirmed" ? "Confirmed." : item.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transactions */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: "1rem" }}>
          Recent Transactions
        </div>
        <div>
          {recentTxns.map((tx, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              padding: "0.75rem 0",
              borderBottom: i < recentTxns.length - 1 ? "1px solid var(--line)" : "none",
              fontSize: "0.82rem",
            }}>
              <span style={{ color: "var(--muted)" }}>{tx.label}</span>
              <span style={{ fontWeight: 600, color: tx.type === "credit" ? "var(--green)" : "var(--red)" }}>
                {tx.type === "credit" ? "+" : "−"}{formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UsePage() {
  return <WalletGate><UseValueContent /></WalletGate>;
}