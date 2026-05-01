// FILE: app/marketplace/page.tsx
"use client";

import Link from "next/link";
import { VAULTS, fmtUSD } from "@/lib/appData";

export default function MarketplacePage() {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Marketplace</p>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 5vw, 2.5rem)", letterSpacing: "-0.02em", marginBottom: "0.625rem" }}>
        Active vaults
      </h1>
      <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "2rem" }}>
        {VAULTS.length} operating · {fmtUSD(VAULTS.reduce((s, v) => s + v.tvl, 0))} total AUM
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {VAULTS.map((v) => (
          <Link key={v.id} href={`/vault/${v.id}`} style={{ textDecoration: "none" }}>
            <div style={{
              background: "var(--surface)", border: "1px solid var(--line)",
              borderRadius: "12px", padding: "1.25rem 1.5rem",
              cursor: "pointer", transition: "border 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>{v.name}</span>
                    <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.45rem", borderRadius: "4px",
                      background: v.status === "operating" ? "rgba(61,214,140,0.1)" : "rgba(240,217,138,0.1)",
                      color: v.status === "operating" ? "var(--green)" : "#f0d98a",
                      border: `1px solid ${v.status === "operating" ? "rgba(61,214,140,0.3)" : "rgba(240,217,138,0.3)"}`,
                      letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700,
                    }}>
                      {v.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--subtle)", marginBottom: "0.5rem" }}>
                    {v.asset} · {v.agent}
                  </div>
                  <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.7rem", flexWrap: "wrap" }}>
                    <span><span style={{ color: "var(--subtle)" }}>TVL: </span><span style={{ color: "var(--text)", fontWeight: 600 }}>{fmtUSD(v.tvl)}</span></span>
                    <a href={v.solscanUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                      style={{ color: "var(--gold)", textDecoration: "none", fontFamily: "'JetBrains Mono', monospace" }}>
                      {v.shortAddress} ↗
                    </a>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: "1.4rem", color: "var(--green)" }}>{v.apy}%</div>
                  <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>APY</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}