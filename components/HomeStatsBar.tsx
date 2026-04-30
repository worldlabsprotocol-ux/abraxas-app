"use client";

import { useState } from "react";
import { usePortfolioData } from "@/lib/usePortfolioData";
import { systemStats } from "@/lib/mockData";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function HomeStatsBar() {
  const { systemAUM, loading } = usePortfolioData();
  const [showAUMContext, setShowAUMContext] = useState(false);

  const stats = [
    { label: "Total AUM",     value: loading ? "…" : formatCurrency(systemAUM), hasContext: true },
    { label: "Active Vaults", value: String(systemStats.vaultsActive) },
    { label: "Agents Online", value: String(systemStats.agentsOnline) },
    { label: "System Status", value: "Operational", green: true },
  ];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", textAlign: "center" }}>
        {stats.map((s) => (
          <div key={s.label}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.4rem", color: s.green ? "var(--green)" : "var(--text)" }}>
                {s.value}
              </span>
              {s.hasContext && (
                <button
                  onClick={() => setShowAUMContext((v) => !v)}
                  style={{ background: "none", border: "1px solid var(--line)", borderRadius: "50%", width: "14px", height: "14px", cursor: "pointer", fontSize: "0.55rem", color: "var(--subtle)", lineHeight: 1, flexShrink: 0, padding: 0 }}
                  title="About this number"
                >
                  ?
                </button>
              )}
            </div>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginTop: "4px" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* AUM context — shown when user taps the ? */}
      {showAUMContext && (
        <div style={{
          marginTop: "1rem",
          padding: "0.875rem 1.25rem",
          background: "rgba(200,169,110,0.05)",
          border: "1px solid rgba(200,169,110,0.2)",
          borderRadius: "10px",
          fontSize: "0.75rem",
          color: "var(--muted)",
          lineHeight: 1.7,
        }}>
          <p style={{ fontWeight: 600, color: "var(--gold)", marginBottom: "0.375rem" }}>About this number</p>
          <p>
            This AUM figure reflects capital tracked across World Labs Protocol's operating history — including trading fund positions from 2023 and asset tokenization work done with Native American and Mexico reservation communities, helping move traditionally illiquid assets on-chain starting in 2023.
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            Abraxas is the protocol being built to formally operate these assets and new capital through an autonomous agent architecture. Existing positions from MPC vaults and institutional accounts are being reconfigured into the Abraxas vault structure. The number reflects real prior work — not projected or simulated figures.
          </p>
          <button onClick={() => setShowAUMContext(false)} style={{ marginTop: "0.5rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.68rem", color: "var(--subtle)", padding: 0 }}>
            Close ✕
          </button>
        </div>
      )}
    </div>
  );
}