"use client";
// FILE: components/terminal/HowItWorksSteps.tsx
// Condensed into a short horizontal feed instead of stacked
// paragraph cards, one line per step instead of a full sentence,
// asset classes folded into the same compact section.

import { S, G, B, A } from "./tokens";

const STEPS = [
  { n:"01", color:G, title:"Create Your Passport", desc:"Email or wallet, no seed phrase needed" },
  { n:"02", color:B, title:"Verify Once",          desc:"ID + liveness check, one time" },
  { n:"03", color:A, title:"Tokenize Everything",  desc:"Real estate, royalties, IP, minerals" },
];

const ASSET_TYPES = [
  { label:"Real Estate",      color:G,  icon:"⌂" },
  { label:"Music Royalties",  color:"#8B5CF6", icon:"\u266a" },
  { label:"Wyoming LLC",      color:B,  icon:"\u25a0" },
  { label:"Books & IP",       color:A,  icon:"\u25c6" },
  { label:"Mineral Rights",   color:G,  icon:"\u25c9" },
  { label:"Collectibles",     color:"#06B6D4", icon:"\u25c7" },
];

export function HowItWorksSteps() {
  return (
    <div>
      <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                     color:"var(--text-primary)", marginBottom:"0.75rem" }}>
        How it works
      </div>
      <div style={{ display:"flex", gap:"0.625rem", overflowX:"auto",
                     marginBottom:"1rem", paddingBottom:"0.25rem" }}>
        {STEPS.map(step => (
          <div key={step.n} style={{ padding:"0.75rem 0.875rem", borderRadius:10,
                                       background:"var(--surface-raised)",
                                       border:"1px solid var(--border)",
                                       flex:"1 1 160px", minWidth:160 }}>
            <div style={{ fontFamily:S, fontSize:"0.65rem", fontWeight:700,
                           color:step.color, marginBottom:"0.3rem" }}>
              {step.n}
            </div>
            <div style={{ fontFamily:S, fontSize:"0.8rem", fontWeight:700,
                           color:"var(--text-primary)", marginBottom:"0.2rem" }}>
              {step.title}
            </div>
            <div style={{ fontFamily:S, fontSize:"0.68rem",
                           color:"var(--text-muted)" }}>
              {step.desc}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
        {ASSET_TYPES.map(a => (
          <div key={a.label} style={{ display:"flex", alignItems:"center",
                                        gap:"0.375rem", padding:"0.4rem 0.75rem",
                                        borderRadius:20, background:`${a.color}10`,
                                        border:`1px solid ${a.color}25` }}>
            <span style={{ color:a.color, fontSize:"0.85rem" }}>{a.icon}</span>
            <span style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:600,
                            color:"var(--text-secondary)" }}>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
