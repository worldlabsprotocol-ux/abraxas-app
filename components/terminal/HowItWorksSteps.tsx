"use client";
// FILE: components/terminal/HowItWorksSteps.tsx
// The 3-step explainer that used to live only on the loading page,
// which almost nobody scrolled past to see, including the founder.
// Now lives directly in the terminal where people actually are.

import { S, G, B, A, W, BDR } from "./tokens";

const STEPS = [
  {
    n:"01", color:G,
    title:"Create Your Passport",
    desc:"Sign in with email or connect your wallet. Abraxas creates your identity profile in seconds, no seed phrases required for new users.",
  },
  {
    n:"02", color:B,
    title:"Verify Once",
    desc:"Complete a single identity check. Government ID and a liveness check through a certified provider. Your credential is issued and reused everywhere after.",
  },
  {
    n:"03", color:A,
    title:"Tokenize Everything",
    desc:"Submit your asset: real estate, a music catalog, mineral rights, IP, books. Our team verifies it, then it's eligible for investment or as collateral.",
  },
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
                     color:W, marginBottom:"0.375rem" }}>
        How it works
      </div>
      <div style={{ fontFamily:S, fontSize:"0.78rem",
                     color:"rgba(255,255,255,0.45)", marginBottom:"1.25rem" }}>
        Three steps to verified, collateral-eligible assets.
      </div>
      <div style={{ display:"grid",
                     gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
                     gap:"0.875rem", marginBottom:"1.25rem" }}>
        {STEPS.map(step => (
          <div key={step.n} style={{ padding:"1rem", borderRadius:10,
                                       background:"rgba(255,255,255,0.02)",
                                       border:`1px solid ${BDR}` }}>
            <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:700,
                           color:step.color, marginBottom:"0.5rem" }}>
              {step.n}
            </div>
            <div style={{ fontFamily:S, fontSize:"0.88rem", fontWeight:700,
                           color:W, marginBottom:"0.375rem" }}>
              {step.title}
            </div>
            <div style={{ fontFamily:S, fontSize:"0.74rem",
                           color:"rgba(255,255,255,0.45)", lineHeight:1.6 }}>
              {step.desc}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:700,
                     color:W, marginBottom:"0.25rem" }}>
        Supported asset classes
      </div>
      <div style={{ fontFamily:S, fontSize:"0.72rem",
                     color:"rgba(255,255,255,0.4)", marginBottom:"0.75rem" }}>
        Any asset. One credential.
      </div>
      <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
        {ASSET_TYPES.map(a => (
          <div key={a.label} style={{ display:"flex", alignItems:"center",
                                        gap:"0.375rem", padding:"0.4rem 0.75rem",
                                        borderRadius:20, background:`${a.color}10`,
                                        border:`1px solid ${a.color}25` }}>
            <span style={{ color:a.color, fontSize:"0.85rem" }}>{a.icon}</span>
            <span style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:600,
                            color:"rgba(255,255,255,0.65)" }}>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
