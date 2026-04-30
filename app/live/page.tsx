"use client";

import { useState, useEffect } from "react";
import { AgentFeed } from "@/components/AgentFeed";
import { DefenseFeed } from "@/components/DefenseFeed";
import { RevenuePanel } from "@/components/RevenuePanel";
import { MarketFeed } from "@/components/MarketFeed";
import { NFTMarketFeed } from "@/components/NFTMarketFeed";
import { Heartbeat } from "@/components/Heartbeat";
import { usePortfolioData } from "@/lib/usePortfolioData";
import { systemStats } from "@/lib/mockData";
import { formatNumber, formatCurrency } from "@/lib/utils";

function useTicker(base: number, ms = 7000) {
  const [v, setV] = useState(base);
  useEffect(() => {
    const t = setInterval(() => setV((n) => n + Math.floor(Math.random() * 3) + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
  return v;
}

export default function LivePage() {
  const portfolio = usePortfolioData();
  const actions = useTicker(systemStats.totalActions);

  const stats = [
    { label: "Total AUM",             value: portfolio.loading ? "…" : formatCurrency(portfolio.systemAUM) },
    { label: "Agent Actions",         value: formatNumber(actions), live: true },
    { label: "Defense Events",        value: formatNumber(systemStats.totalDefenseEvents) },
    { label: "Unrecovered Positions", value: "0", highlight: true },
    { label: "Agents Online",         value: String(systemStats.agentsOnline) },
    { label: "Vaults Active",         value: String(systemStats.vaultsActive) },
    { label: "System Uptime",         value: `${systemStats.uptimePct}%` },
    { label: "Chain",                 value: "Solana" },
  ];

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)" }}>Live System</span>
          <Heartbeat />
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.5rem)", letterSpacing: "-0.01em" }}>
          Abraxas is operating.
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "var(--surface)", border: `1px solid ${s.highlight ? "rgba(61,214,140,0.2)" : "var(--line)"}`, borderRadius: "12px", padding: "1rem 1.25rem" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: s.highlight ? "var(--green)" : "var(--text)", marginBottom: "0.2rem" }}>
              {s.value}{s.live && <span style={{ fontSize: "0.4rem", color: "var(--green)", marginLeft: "2px" }}>▲</span>}
            </div>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "1.5rem" }}><RevenuePanel /></div>

      <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "1fr", marginBottom: "1.5rem" }} className="lg:grid-cols-2">
        <AgentFeed />
        <DefenseFeed />
      </div>

      <MarketFeed />
      <div style={{ marginTop: "1.25rem" }}>
        <NFTMarketFeed />
      </div>
    </div>
  );
}