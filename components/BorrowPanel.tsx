// FILE: components/BorrowPanel.tsx
// Institutional borrow panel. 8/10 feel.
// Shows LTV, health factor, liquidation threshold.
// Links to Loopscale. Sticky sidebar layout.
"use client";

import { useState } from "react";

const MONO = "'JetBrains Mono',monospace";

interface Props {
  assetId:          string;
  ltv:              number;
  collateralScore:  number | null;
  estimatedUsdValue: number;
  verificationStatus: string;
}

const ELIGIBLE_STATUSES = new Set(["collateral_eligible","borrowed","listed"]);

function fmt(n: number) {
  return n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M`
       : n >= 1_000     ? `$${(n/1_000).toFixed(1)}K`
       :                   `$${n.toFixed(0)}`;
}

export function BorrowPanel({ assetId, ltv, collateralScore, estimatedUsdValue, verificationStatus }: Props) {
  const [hover, setHover] = useState(false);
  const isEligible = ELIGIBLE_STATUSES.has(verificationStatus);
  const maxBorrow  = Math.round(estimatedUsdValue * ltv / 100);
  const hf         = estimatedUsdValue > 0 ? (estimatedUsdValue / Math.max(1, estimatedUsdValue * 0.82)).toFixed(2) : "—";
  const score      = collateralScore ?? 0;

  return (
    <div style={{
      border:`1px solid ${isEligible ? "rgba(20,241,149,0.2)" : "rgba(255,255,255,0.08)"}`,
      borderRadius:"10px", overflow:"hidden",
      background:"rgba(6,8,16,0.98)",
      position:"sticky", top:"1rem",
    }}>
      {/* Status strip */}
      <div style={{
        padding:"0.875rem 1.25rem",
        background: isEligible ? "rgba(20,241,149,0.05)" : "rgba(255,255,255,0.02)",
        borderBottom:`1px solid ${isEligible ? "rgba(20,241,149,0.1)" : "rgba(255,255,255,0.06)"}`,
      }}>
        <div style={{ fontSize:"0.4rem", fontWeight:700, fontFamily:MONO,
                      color: isEligible ? "rgba(20,241,149,0.6)" : "rgba(255,255,255,0.2)",
                      textTransform:"uppercase", letterSpacing:"0.18em" }}>
          {isEligible ? "Collateral Ready — Borrow Active" : "Verification Pending — Borrow Locked"}
        </div>
      </div>

      <div style={{ padding:"1.5rem 1.25rem" }}>
        {/* LTV big number */}
        <div style={{ marginBottom:"1.5rem" }}>
          <div style={{ fontSize:"3rem", fontWeight:900, fontFamily:MONO,
                        color: isEligible ? "#14F195" : "rgba(255,255,255,0.2)",
                        lineHeight:1, marginBottom:4 }}>
            {ltv}%
          </div>
          <div style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.3)", fontFamily:MONO,
                        textTransform:"uppercase", letterSpacing:"0.12em" }}>
            Maximum LTV · USDC
          </div>
        </div>

        {/* Metrics */}
        {([
          ["Max Borrow",   isEligible ? `${fmt(maxBorrow)} USDC` : "Pending", isEligible ? "#f0f0f0" : "rgba(255,255,255,0.2)"],
          ["Health Factor", isEligible ? hf : "—",                           isEligible ? "#14F195" : "rgba(255,255,255,0.2)"],
          ["Liq. Threshold","82%",                                              "rgba(255,255,255,0.45)"],
          ["Collateral Score", score > 0 ? `${score}/100` : "Pending",        score >= 80 ? "#14F195" : score >= 60 ? "#FBBF24" : "rgba(255,255,255,0.35)"],
          ["Protocol",     "Loopscale",                                        "rgba(107,140,255,0.7)"],
        ] as [string,string,string][]).map(([k,v,c]) => (
          <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                padding:"0.55rem 0",
                                borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.3)",
                           fontFamily:MONO, textTransform:"uppercase", letterSpacing:"0.1em" }}>{k}</span>
            <span style={{ fontSize:"0.54rem", fontWeight:700, color:c, fontFamily:MONO }}>{v}</span>
          </div>
        ))}

        {/* CTA */}
        <button
          onClick={() => isEligible && window.open("https://app.loopscale.com","_blank","noopener")}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          disabled={!isEligible}
          style={{
            width:"100%", marginTop:"1.5rem",
            padding:"1rem", borderRadius:"7px",
            fontWeight:800, fontSize:"0.72rem", fontFamily:MONO,
            letterSpacing:"0.04em", cursor: isEligible ? "pointer" : "not-allowed",
            border:"none",
            background: isEligible
              ? hover ? "#10c875" : "#14F195"
              : "rgba(255,255,255,0.05)",
            color: isEligible ? "#060810" : "rgba(255,255,255,0.2)",
            transition:"all 0.15s",
          }}>
          {isEligible ? "Borrow Against Asset" : "Complete Verification First"}
        </button>

        {isEligible && (
          <div style={{ marginTop:"0.625rem", fontSize:"0.42rem", fontFamily:MONO,
                        color:"rgba(255,255,255,0.2)", textAlign:"center", lineHeight:1.6 }}>
            Opens Loopscale · Abraxas verified positions auto-recognized
          </div>
        )}
      </div>
    </div>
  );
}