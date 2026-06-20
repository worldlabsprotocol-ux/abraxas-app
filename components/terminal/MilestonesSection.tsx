"use client";
// FILE: components/terminal/MilestonesSection.tsx
// Protocol progress timeline. Extracted from ContentSection so it can be
// shown at the top of the terminal tab, ahead of the hero and asset grid,
// as the first trust signal a visitor or investor sees.

import { M, S, G, A, B } from "./tokens";
import { ScrollFade } from "./ui";

const MILESTONES = [
  {
    phase:"Live now", color:G,
    items:["W3C VC credential infrastructure","Wyoming LLC formation flow","Asset verification pipeline",
           "Music royalty audit intake","Cielo Sunrise verified, producing monthly yield",
           "Abraxas Precheck, real identity verification via Veriff","Real photo galleries on verified assets",
           "Email sign-in with automatic wallet and profile creation","Stablecoin checkout (Buy Now / Book Now)",
           "Light and dark mode"],
  },
  {
    phase:"In progress", color:A,
    items:["Wallet sign-in (Phantom, Solflare)","Document review for Business, Accredited, and Asset Owner stamps",
           "World Studios KC site identification","Entertainment IP acquisition, in negotiation"],
  },
  {
    phase:"Up next", color:B,
    items:["Utila MPC custody integration","OID4VP passport portability","DocuSign LLC automation",
           "First external protocol integration","Automated on-chain payment verification"],
  },
];

export function MilestonesSection() {
  return (
    <ScrollFade>
      <div style={{ marginBottom:"1.5rem" }}>
        <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                       color:"#fff", marginBottom:"1rem" }}>
          Where the protocol stands today
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          {MILESTONES.map(ms => (
            <div key={ms.phase} style={{ display:"flex", gap:0 }}>
              <div style={{ width:2, background:`${ms.color}25`,
                             flexShrink:0, position:"relative" }}>
                <div style={{ width:9, height:9, borderRadius:"50%",
                               background:ms.color,
                               position:"absolute", top:12, left:-3.5 }} />
              </div>
              <div style={{ paddingLeft:"1.25rem", paddingBottom:"1.25rem",
                             flex:1 }}>
                <div style={{ fontFamily:S, fontSize:"0.72rem", fontWeight:600,
                               color:ms.color,
                               marginBottom:"0.5rem", marginTop:"0.125rem" }}>
                  {ms.phase}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"0.3rem" }}>
                  {ms.items.map(item => (
                    <div key={item}
                      style={{ padding:"0.3rem 0.7rem", borderRadius:20,
                                background:`${ms.color}08`,
                                fontFamily:S, fontSize:"0.72rem",
                                color:"rgba(255,255,255,0.55)",
                                lineHeight:1.4 }}>
                      {ms.phase === "Live now" ? "\u2713 " : ""}{item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollFade>
  );
}
