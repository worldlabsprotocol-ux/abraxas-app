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
const W = "#F8FAFC";
const BDR = "#1C2333";

export function SophiaCircuit() {
  const [expanded, setExpanded] = useState(false);
  const assets = Object.values(INVEST_CONFIGS);

  return (
    <div style={{ marginBottom:"1.5rem", borderRadius:14,
                   border:`1px solid ${V}30`,
                   background:`linear-gradient(135deg,${V}0A,rgba(0,0,0,0))`,
                   overflow:"hidden" }}>
      <div style={{ padding:"1.25rem", display:"flex", justifyContent:"space-between",
                     alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                         color:V, marginBottom:"0.375rem" }}>
            AI Intelligence & Monitoring
          </div>
          <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700, color:W }}>
            Sophia & Circuit
          </div>
          <div style={{ fontFamily:S, fontSize:"0.74rem",
                         color:"rgba(255,255,255,0.45)", marginTop:"0.25rem",
                         maxWidth:480, lineHeight:1.6 }}>
            Sophia analyzes verification confidence and risk across your
            assets. Circuit watches for unusual activity and alerts you.
            Neither moves your funds, every decision stays yours.
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
            // The founding four assets were personally reviewed by the
            // founder before listing, that review is the actual risk
            // mitigation right now. Computed risk levels below kick in
            // once outside users start submitting their own assets.
            const FOUNDER_VETTED = new Set(["aas-1", "aas-2", "aas-3", "aas-4"]);
            const riskLevel = FOUNDER_VETTED.has(asset.id)
              ? "Low"
              : confirmed === checks.length ? "Low" : confirmed >= checks.length / 2 ? "Moderate" : "Elevated";
            const riskColor = riskLevel === "Low" ? G : riskLevel === "Moderate" ? A : "#EF4444";
            return (
              <div key={asset.id} style={{ padding:"0.875rem", borderRadius:10,
                                            background:"#0A0C10", border:`1px solid ${BDR}`,
                                            display:"flex", justifyContent:"space-between",
                                            alignItems:"center", flexWrap:"wrap", gap:"0.625rem" }}>
                <div>
                  <div style={{ fontFamily:S, fontSize:"0.82rem", fontWeight:700, color:W }}>
                    {asset.name}
                  </div>
                  <div style={{ fontFamily:S, fontSize:"0.68rem",
                                 color:"rgba(255,255,255,0.4)", marginTop:2 }}>
                    Sophia: {confirmed}/{checks.length} verification checks confirmed
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
                         color:"rgba(255,255,255,0.3)", lineHeight:1.5, marginTop:"0.25rem" }}>
            The founding four assets carry a founder-reviewed designation,
            personally vetted before listing. Computed risk scoring applies
            once outside users begin submitting their own assets.
          </div>
        </div>
      )}
    </div>
  );
}
