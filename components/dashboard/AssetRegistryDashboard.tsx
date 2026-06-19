"use client";
// FILE: components/dashboard/AssetRegistryDashboard.tsx
// Full registry of all verified assets. Lives on the Dashboard tab now,
// not the terminal tab. Pulls from the same INVEST_CONFIGS source of
// truth the InvestorPortalModal uses, so the two never drift apart.

import { useState } from "react";
import { INVEST_CONFIGS } from "@/components/terminal/investorConfigs";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "'Inter',system-ui,-apple-system,sans-serif";
const G = "#10B981";
const W = "#F8FAFC";
const BDR = "#1C2333";
const CARD = "#0D1117";

export function AssetRegistryDashboard() {
  const [openId, setOpenId] = useState<string | null>(null);
  const assets = Object.values(INVEST_CONFIGS);

  return (
    <div style={{ marginBottom:"1.5rem" }}>
      <div style={{ display:"flex", alignItems:"baseline",
                     justifyContent:"space-between", marginBottom:"1rem" }}>
        <div style={{ fontFamily:S, fontSize:"1rem", fontWeight:700, color:W }}>
          Asset registry
        </div>
        <div style={{ fontFamily:S, fontSize:"0.72rem",
                       color:"rgba(255,255,255,0.35)" }}>
          {assets.length} verified assets
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"0.625rem" }}>
        {assets.map(asset => {
          const open = openId === asset.id;
          return (
            <div key={asset.id}
              style={{ background:CARD, border:`1px solid ${BDR}`,
                        borderLeft:`3px solid ${G}`,
                        borderRadius:10, overflow:"hidden" }}>
              <div
                onClick={() => setOpenId(open ? null : asset.id)}
                style={{ padding:"1rem 1.125rem", cursor:"pointer",
                          display:"flex", justifyContent:"space-between",
                          alignItems:"center", flexWrap:"wrap", gap:"0.625rem" }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center",
                                 gap:"0.625rem", marginBottom:"0.25rem" }}>
                    <span style={{ fontFamily:S, fontSize:"0.92rem",
                                    fontWeight:700, color:W }}>
                      {asset.name}
                    </span>
                    <span style={{ fontFamily:S, fontSize:"0.65rem", fontWeight:600,
                                    color:G, background:`${G}12`,
                                    borderRadius:20, padding:"0.15rem 0.6rem" }}>
                      Verified
                    </span>
                  </div>
                  <div style={{ fontFamily:S, fontSize:"0.75rem",
                                 color:"rgba(255,255,255,0.4)" }}>
                    {asset.subtitle}
                  </div>
                </div>
                <span style={{ fontFamily:M, fontSize:"0.75rem",
                                color:G }}>
                  {open ? "Hide" : "View"}
                </span>
              </div>

              {open && (
                <div style={{ padding:"0 1.125rem 1.125rem" }}>
                  <div style={{ display:"grid",
                                 gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
                                 gap:"1px", background:BDR, borderRadius:8,
                                 overflow:"hidden" }}>
                    {asset.stats.map(s => (
                      <div key={s.label} style={{ background:"#08090F",
                                                    padding:"0.625rem 0.75rem" }}>
                        <div style={{ fontFamily:S, fontSize:"0.6rem",
                                       color:"rgba(255,255,255,0.3)", marginBottom:2 }}>
                          {s.label}
                        </div>
                        <div style={{ fontFamily:M, fontSize:"0.82rem",
                                       fontWeight:700, color:G }}>
                          {s.val}
                        </div>
                      </div>
                    ))}
                  </div>
                  {asset.historicalNote && (
                    <div style={{ marginTop:"0.75rem", fontFamily:S,
                                   fontSize:"0.74rem",
                                   color:"rgba(255,255,255,0.4)", lineHeight:1.6 }}>
                      {asset.historicalNote}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
