"use client";

import { useState } from "react";
import { usePortfolioData } from "@/lib/usePortfolioData";
import { systemStats } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";

export function HomeStatsBar() {
  const { systemAUM, loading, updatedAt } = usePortfolioData();
  const [showAUMContext, setShowAUMContext] = useState(false);

  const ts = updatedAt ? new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  const stats = [
    { label: "Total AUM",     value: loading ? "…" : formatCurrency(systemAUM), hasContext: true },
    { label: "Active Vaults", value: String(systemStats.vaultsActive)  },
    { label: "Agents Online", value: String(systemStats.agentsOnline)  },
    { label: "System Status", value: "Operational", green: true        },
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
                <button onClick={() => setShowAUMContext((v) => !v)}
                  style={{ background: "none", border: "1px solid var(--line)", borderRadius: "50%", width: "14px", height: "14px", cursor: "pointer", fontSize: "0.55rem", color: "var(--subtle)", lineHeight: 1, flexShrink: 0, padding: 0 }}
                  title="About this number">?</button>
              )}
            </div>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginTop: "4px" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Stat freshness timestamp. per Mrityunjay item 07 */}
      {ts && (
        <p style={{ textAlign: "center", fontSize: "0.58rem", color: "var(--subtle)", marginTop: "0.625rem" }}>
          Updated {ts} · Sum of vault TVLs · <button onClick={() => setShowAUMContext((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gold)", fontSize: "0.58rem", padding: 0, textDecoration: "underline" }}>Methodology ↗</button>
        </p>
      )}

      {showAUMContext && (
        <div style={{ marginTop: "1rem", padding: "0.875rem 1.25rem", background: "rgba(200,169,110,0.05)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "10px", fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.7 }}>
          <p style={{ fontWeight: 600, color: "var(--gold)", marginBottom: "0.375rem" }}>AUM Methodology</p>
          <p>Total AUM is the sum of TVLs across all 5 active vaults. exactly the numbers you see in the vault marketplace. No multiplier, no pipeline projection.</p>
          <p style={{ marginTop: "0.5rem" }}>This figure reflects World Labs Protocol's operating history. including trading fund positions from 2023 and asset tokenization work with Native American and Mexico reservation communities (moving traditionally illiquid assets on-chain starting 2023). Existing positions from MPC vaults and institutional accounts are being reconfigured into the Abraxas vault structure. The number reflects real prior work, not forward projections.</p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.68rem", color: "var(--subtle)" }}>
            For full metric definitions see <a href="/methodology" style={{ color: "var(--gold)" }}>/methodology</a> · For defense event details see <a href="/transparency" style={{ color: "var(--gold)" }}>/transparency</a>
          </p>
          <button onClick={() => setShowAUMContext(false)} style={{ marginTop: "0.5rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.65rem", color: "var(--subtle)", padding: 0 }}>Close ✕</button>
        </div>
      )}
    </div>
  );
}