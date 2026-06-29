// FILE: app/marketplace/page.tsx
"use client";

import Link from "next/link";
import { VAULTS, fmtUSD } from "@/lib/appData";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { MotionCard } from "@/lib/motion/MotionCard";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export default function MarketplacePage() {
  return (
    <RedesignShell>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "clamp(2.5rem,6vw,4rem) clamp(1rem,3vw,2rem) 5rem" }}>
        <div style={{ fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em",
                       textTransform: "uppercase", color: ACCENT, marginBottom: "0.6rem" }}>
          Marketplace
        </div>
        <h1 style={{ fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
                      letterSpacing: "-0.03em", lineHeight: 1.05, color: "var(--text-primary)",
                      margin: "0 0 0.6rem" }}>
          Active vaults
        </h1>
        <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: "var(--text-secondary)",
                     margin: "0 0 2rem" }}>
          {VAULTS.length} operating · {fmtUSD(VAULTS.reduce((s, v) => s + v.tvl, 0))} total AUM
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {VAULTS.map((v) => {
            const operating = v.status === "operating";
            return (
              <Link key={v.id} href={`/vault/${v.id}`} style={{ textDecoration: "none" }}>
                <MotionCard style={{
                  background: "var(--surface-raised)", border: "1px solid var(--border)",
                  borderRadius: 16, padding: "1.25rem 1.5rem",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                                 gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem",
                                     marginBottom: "0.35rem", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "1.05rem",
                                        color: "var(--text-primary)" }}>{v.name}</span>
                        <span style={{ fontFamily: FONT, fontSize: "0.56rem", padding: "0.12rem 0.5rem",
                          borderRadius: 999, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700,
                          background: operating ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                          color: operating ? ACCENT : "#F59E0B",
                          border: `1px solid ${operating ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}` }}>
                          {v.status}
                        </span>
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)",
                                     marginBottom: "0.6rem" }}>
                        {v.asset} · {v.agent}
                      </div>
                      <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.74rem", flexWrap: "wrap" }}>
                        <span><span style={{ color: "var(--text-muted)" }}>TVL: </span>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{fmtUSD(v.tvl)}</span></span>
                        <a href={v.solscanUrl} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: ACCENT, textDecoration: "none", fontFamily: "'JetBrains Mono',monospace" }}>
                          {v.shortAddress} ↗
                        </a>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Space Grotesk','Inter',sans-serif", fontWeight: 800,
                                     fontSize: "1.5rem", color: ACCENT, letterSpacing: "-0.02em" }}>{v.apy}%</div>
                      <div style={{ fontFamily: FONT, fontSize: "0.6rem", color: "var(--text-muted)",
                                     textTransform: "uppercase", letterSpacing: "0.08em" }}>APY</div>
                    </div>
                  </div>
                </MotionCard>
              </Link>
            );
          })}
        </div>
      </div>
    </RedesignShell>
  );
}
