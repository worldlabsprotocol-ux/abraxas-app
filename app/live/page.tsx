"use client";

import { AgentFeed } from "@/components/AgentFeed";
import { DefenseFeed } from "@/components/DefenseFeed";
import { RevenuePanel } from "@/components/RevenuePanel";
import { Heartbeat } from "@/components/Heartbeat";
import { systemStats } from "@/lib/mockData";
import { useLiveFeed } from "@/lib/useLiveFeed";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";

// Counters tick upward to feel alive
function useTicker(base: number, intervalMs = 8000) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const t = setInterval(() => {
      setVal((v) => v + Math.floor(Math.random() * 3) + 1);
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return val;
}

export default function LivePage() {
  const totalActions = useTicker(systemStats.totalActions, 6000);
  const { secondsAgo } = useLiveFeed(0);

  const stats = [
    { label: "Total AUM", value: formatCurrency(systemStats.totalAUM) },
    { label: "Agent Actions", value: formatNumber(totalActions), live: true },
    { label: "Defense Events", value: formatNumber(systemStats.totalDefenseEvents) },
    { label: "Unrecovered Positions", value: "0", highlight: true },
    { label: "Agents Online", value: String(systemStats.agentsOnline) },
    { label: "Vaults Active", value: String(systemStats.vaultsActive) },
    { label: "System Uptime", value: `${systemStats.uptimePct}%` },
    { label: "Settlement Chain", value: "Solana" },
  ];

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)" }}>
              Live System Performance
            </span>
          </div>
          <Heartbeat />
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.5rem)", letterSpacing: "-0.01em", marginBottom: "0.5rem" }}>
          Abraxas is operating.
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", maxWidth: "500px", lineHeight: 1.65 }}>
          Autonomous agents executing continuously. Every action logged. Every position defended.
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background: "var(--surface)",
            border: `1px solid ${s.highlight ? "rgba(61,214,140,0.2)" : "var(--line)"}`,
            borderRadius: "12px",
            padding: "1rem 1.25rem",
          }}>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "1.3rem",
              letterSpacing: "-0.01em",
              color: s.highlight ? "var(--green)" : s.live ? "var(--text)" : "var(--text)",
              marginBottom: "0.25rem",
              transition: "color 0.3s",
            }}>
              {s.value}
              {s.live && <span style={{ fontSize: "0.5rem", color: "var(--green)", marginLeft: "4px", verticalAlign: "middle" }}>▲</span>}
            </div>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue panel */}
      <div style={{ marginBottom: "1.5rem" }}>
        <RevenuePanel />
      </div>

      {/* Feeds */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }} className="lg:grid-cols-2">
        <AgentFeed />
        <DefenseFeed />
      </div>

      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.65rem", color: "var(--subtle)", letterSpacing: "0.05em" }}>
          Beta · Agent network in active development · On-chain verification at graduation
        </p>
      </div>
    </div>
  );
}