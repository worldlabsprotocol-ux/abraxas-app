"use client";
// FILE: components/dashboard/SophiaCircuit.tsx
// Honors the original hackathon-winning pitch (Sophia AI agents,
// Circuit safety agent) the way that's actually legal to build right
// now: real intelligence and monitoring, not autonomous discretionary
// trading or automated payouts, which would require investment-
// adviser registration we don't have. Same protective spirit, the
// person stays in control of every action.

import { useState } from "react";
import { INVEST_CONFIGS } from "@/components/terminal/investorConfigs";

const S = "'Inter',system-ui,-apple-system,sans-serif";
const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";
const V = "#8B5CF6";
const A = "#F59E0B";
const W = "#15151A";
const BDR = "#E5E5E0";

export function SophiaCircuit() {
  const [expanded, setExpanded] = useState(false);
  const assets = Object.values(INVEST_CONFIGS);

  return (
    <div style={{ marginBottom:"1.5rem", borderRadius:14,
                   border:`1px solid ${V}30`,
                   background:`${V}0A`,
                   overflow:"hidden" }}>
      <div style={{ padding:"1.25rem", display:"flex", justifyContent:"space-between",
                     alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                         color:V, marginBottom:"0.375rem" }}>
            Official Auditor, Verified Asset Classes
          </div>
          <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700, color:W }}>
            Sophia & Circuit
          </div>
          <div style={{ fontFamily:S, fontSize:"0.74rem",
                         color:"rgba(21,21,26,0.45)", marginTop:"0.25rem",
                         maxWidth:480, lineHeight:1.6 }}>
            Sophia analyzes verification confidence and risk across every
            asset class on Abraxas, real estate, royalties, minerals,
            environmental and reforestation projects included. Circuit
            watches for unusual activity and flags it. Neither moves your
            funds, every decision stays yours, this is the measurement
            layer that keeps the protocol's pipeline a trusted one.
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)}
          style={{ padding:"0.4rem 0.875rem", borderRadius:20, border:`1px solid ${V}40`,
                    background:"transparent", color:V, fontFamily:S,
                    fontSize:"0.72rem", fontWeight:600, cursor:"pointer" }}>
          {expanded ? "Hide" : "View analysis"}
        </button>
      </div>

      {expanded && (
        <div style={{ padding:"0 1.25rem 1.25rem", display:"flex",
                       flexDirection:"column", gap:"0.625rem" }}>
          {assets.map(asset => {
            const checks = asset.confidenceChecks ?? [];
            const confirmed = checks.filter(c => c.status === "confirmed").length;
            // Reads founderVetted directly off the asset config, the
            // single source of truth in investorConfigs.ts. No separate
            // list to keep in sync here anymore, add a new asset there
            // and this picks it up automatically.
            const riskLevel = asset.founderVetted
              ? "Low"
              : confirmed === checks.length ? "Low" : confirmed >= checks.length / 2 ? "Moderate" : "Elevated";
            const riskColor = riskLevel === "Low" ? G : riskLevel === "Moderate" ? A : "#EF4444";
            return (
              <div key={asset.id} style={{ padding:"0.875rem", borderRadius:10,
                                            background:"#FAFAF8", border:`1px solid ${BDR}`,
                                            display:"flex", justifyContent:"space-between",
                                            alignItems:"center", flexWrap:"wrap", gap:"0.625rem" }}>
                <div>
                  <div style={{ fontFamily:S, fontSize:"0.82rem", fontWeight:700, color:W }}>
                    {asset.name}
                  </div>
                  <div style={{ fontFamily:S, fontSize:"0.68rem",
                                 color:"rgba(21,21,26,0.4)", marginTop:2 }}>
                    {asset.founderVetted
                      ? "Sophia: Founder-reviewed before listing"
                      : `Sophia: ${confirmed}/${checks.length} verification checks confirmed`}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:riskColor }} />
                  <span style={{ fontFamily:M, fontSize:"0.65rem", fontWeight:700, color:riskColor }}>
                    Circuit: {riskLevel} risk
                  </span>
                </div>
              </div>
            );
          })}
          <div style={{ fontFamily:S, fontSize:"0.66rem",
                         color:"rgba(21,21,26,0.3)", lineHeight:1.5, marginTop:"0.25rem" }}>
            The founding four assets carry a founder-reviewed designation,
            personally vetted before listing. Computed risk scoring applies
            once outside users begin submitting their own assets.
          </div>
        </div>
      )}
    </div>
  );
}
