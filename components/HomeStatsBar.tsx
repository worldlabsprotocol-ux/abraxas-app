"use client";

import { usePortfolioData } from "@/lib/usePortfolioData";
import { systemStats } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";

export function HomeStatsBar() {
  const { systemAUM, loading } = usePortfolioData();
  const stats = [
    { label: "Total AUM",     value: loading ? "…" : formatCurrency(systemAUM) },
    { label: "Active Vaults", value: String(systemStats.vaultsActive) },
    { label: "Agents Online", value: String(systemStats.agentsOnline) },
    { label: "System Status", value: "Operational" },
  ];
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", textAlign: "center" }}>
      {stats.map((s) => (
        <div key={s.label}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.4rem", color: s.label === "System Status" ? "var(--green)" : "var(--text)" }}>{s.value}</div>
          <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginTop: "4px" }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}