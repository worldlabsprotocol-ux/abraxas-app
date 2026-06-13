"use client";
// FILE: components/terminal/RegistryView.tsx
// Asset registry inspector panel — shown when deep === "registry".

import { DeepViewShell } from "./DeepViewShell";
import { M, S, G, W, BDR, CARD } from "./tokens";

interface RegistryViewProps {
  onBack: () => void;
}

const STATS = [
  { label: "Verified Properties", val: "4" },
  { label: "Pending Verification", val: "0" },
  { label: "Total AUM",            val: "$2.8M+" },
  { label: "Avg Collateral Score", val: "89/100" },
];

export function RegistryView({ onBack }: RegistryViewProps) {
  return (
    <DeepViewShell onBack={onBack}>
      <div style={{ padding:"2rem", fontFamily:M, color:W,
                     maxWidth:800, margin:"0 auto" }}>
        <div style={{ fontSize:"0.7rem", color:G, fontWeight:700,
                       textTransform:"uppercase", letterSpacing:"0.2em",
                       marginBottom:"1.5rem" }}>
          ABRAXAS REGISTRY · VERIFIED ASSETS
        </div>
        <div style={{ fontFamily:"Georgia,serif",
                       fontSize:"clamp(1.4rem,3.5vw,2rem)",
                       fontWeight:700, color:W, marginBottom:"0.875rem" }}>
          Ownership Infrastructure for Real-World Assets.
        </div>
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",
                       gap:"1px", background:BDR, borderRadius:7,
                       overflow:"hidden", marginBottom:"1.5rem" }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background:CARD, padding:"0.875rem" }}>
              <div style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.3)",
                             textTransform:"uppercase", letterSpacing:"0.12em",
                             marginBottom:4 }}>
                {s.label}
              </div>
              <div style={{ fontSize:"1.25rem", fontWeight:900, color:G }}>
                {s.val}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.4)",
                       marginBottom:"0.7rem", letterSpacing:"0.1em",
                       textTransform:"uppercase" }}>
          AAS-1 · GENESIS ASSET
        </div>
        <div style={{ fontFamily:"Georgia,serif", fontSize:"1.1rem",
                       fontWeight:700, color:W, marginBottom:4 }}>
          Cielo Sunrise — Mountain Wellness Retreat
        </div>
        <div style={{ fontFamily:S, fontSize:"0.75rem",
                       color:"rgba(255,255,255,0.4)" }}>
          Mineral Bluff, Georgia · $1,100,000 appraised ·
          89/100 collateral score · 96% verification confidence ·
          $660K max borrow capacity
        </div>
      </div>
    </DeepViewShell>
  );
}
