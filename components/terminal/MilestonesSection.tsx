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
    items:["W3C VC credential infrastructure","Wyoming LLC formation flow","V5 10-stage asset pipeline",
           "Music royalty audit intake","Cielo Sunrise AAS-1 verified","AbraxasPassport UI","Stripe payment rails"],
  },
  {
    phase:"In progress", color:A,
    items:["Veriff biometric IDV activation","Live credential issuance","World Studios KC site identified","LifeWay IP rights negotiation"],
  },
  {
    phase:"Up next", color:B,
    items:["Utilia MPC custody integration","OID4VP passport portability","DocuSign LLC automation","First external protocol integration"],
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
