"use client";
// FILE: components/terminal/DealsProgress.tsx
// Honest progress tracker for active land, mineral, and oil deal pipeline.
// Shows where each deal actually is — no hype, no fake progress.

import { M, S, G, A, B, W, BDR, CARD, TEAL } from "./tokens";

interface Deal {
  id: string;
  name: string;
  type: string;
  color: string;
  stages: string[];
  current: number;
  note: string;
}

const DEALS: Deal[] = [
  {
    id: "tribal-mineral",
    name: "Tribal Mineral Rights",
    type: "MINERAL RIGHTS · SOVEREIGN LAND",
    color: A,
    stages: ["Introduced","Due Diligence","LOI Signed","Structured","On-Chain","Active"],
    current: 1,
    note: "Initial discussions active. Operator LOI in progress.",
  },
  {
    id: "oil-gas",
    name: "Oil & Gas Program",
    type: "OIL & GAS · WORKING INTEREST",
    color: "#F97316",
    stages: ["Introduced","Investor Ready","Deal Structured","Funded","Producing","On-Chain"],
    current: 1,
    note: "Deal materials prepared. Investor outreach underway.",
  },
  {
    id: "lifeway-ip",
    name: "LifeWay Live Show IP",
    type: "INTELLECTUAL PROPERTY · LIVE SHOWS",
    color: B,
    stages: ["Introduced","Term Sheet","Negotiation","Acquired","Tokenized","Active"],
    current: 0,
    note: "Initial discussions. Rights valuation in progress.",
  },
  {
    id: "world-studios",
    name: "World Studios Kansas City",
    type: "REAL ESTATE · CREATIVE HUB",
    color: TEAL,
    stages: ["Concept","Site Identified","LOI","Under Contract","Acquired","Open"],
    current: 0,
    note: "Location scouting active. Kansas City market.",
  },
];

function ProgressBar({ stages, current, color }: {
  stages: string[];
  current: number;
  color: string;
}) {
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:0,
                     marginBottom:"0.375rem" }}>
        {stages.map((stage, i) => (
          <div key={stage} style={{ display:"flex", alignItems:"center",
                                     flex: i < stages.length - 1 ? 1 : 0 }}>
            <div style={{ display:"flex", flexDirection:"column",
                           alignItems:"center", gap:"0.2rem", flexShrink:0 }}>
              <div style={{ width:12, height:12, borderRadius:"50%",
                             background: i < current
                               ? color
                               : i === current
                                 ? `${color}40`
                                 : "rgba(255,255,255,0.08)",
                             border: `1.5px solid ${i <= current ? color : "rgba(255,255,255,0.12)"}`,
                             boxShadow: i === current ? `0 0 0 3px ${color}25` : "none",
                             transition:"all 0.3s" }} />
            </div>
            {i < stages.length - 1 && (
              <div style={{ flex:1, height:1, margin:"0 2px",
                             background: i < current
                               ? `${color}60`
                               : "rgba(255,255,255,0.06)",
                             marginBottom:"0.8rem" }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        {stages.map((stage, i) => (
          <div key={stage} style={{ fontFamily:M, fontSize:"0.42rem",
                                     color: i === current ? color
                                       : i < current ? `${color}60`
                                       : "rgba(255,255,255,0.2)",
                                     textAlign:"center",
                                     maxWidth:60, lineHeight:1.2,
                                     fontWeight: i === current ? 700 : 400 }}>
            {stage}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DealsProgress() {
  return (
    <div style={{ marginBottom:"1.5rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                     marginBottom:"0.875rem" }}>
        <div style={{ width:3, height:18, background:A, borderRadius:2,
                       boxShadow:`0 0 6px ${A}60` }} />
        <span style={{ fontFamily:M, fontSize:"clamp(0.78rem,1.8vw,0.92rem)",
                        fontWeight:800, color:A, letterSpacing:"0.16em",
                        textTransform:"uppercase" }}>
          ACTIVE DEAL PIPELINE
        </span>
        <span style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                        color:A, background:`${A}15`, border:`1px solid ${A}30`,
                        borderRadius:3, padding:"1px 7px",
                        letterSpacing:"0.08em", textTransform:"uppercase" }}>
          {DEALS.length} DEALS TRACKED
        </span>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
        {DEALS.map(deal => (
          <div key={deal.id}
            style={{ background:CARD, border:`1px solid ${BDR}`,
                      borderLeft:`3px solid ${deal.color}`,
                      borderRadius:7, padding:"1rem 1.125rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
                           alignItems:"flex-start", marginBottom:"0.75rem",
                           flexWrap:"wrap", gap:"0.5rem" }}>
              <div>
                <div style={{ fontFamily:S, fontSize:"clamp(0.85rem,1.8vw,1rem)",
                               fontWeight:700, color:W, marginBottom:2 }}>
                  {deal.name}
                </div>
                <div style={{ fontFamily:M, fontSize:"0.5rem",
                               color:"rgba(255,255,255,0.3)",
                               letterSpacing:"0.1em",
                               textTransform:"uppercase" }}>
                  {deal.type}
                </div>
              </div>
              <div style={{ padding:"0.2rem 0.5rem", borderRadius:3,
                             background:`${deal.color}12`,
                             border:`1px solid ${deal.color}30`,
                             fontFamily:M, fontSize:"0.48rem", fontWeight:700,
                             color:deal.color, letterSpacing:"0.06em",
                             textTransform:"uppercase", whiteSpace:"nowrap" }}>
                {deal.stages[deal.current]}
              </div>
            </div>

            <ProgressBar
              stages={deal.stages}
              current={deal.current}
              color={deal.color}
            />

            <div style={{ fontFamily:S, fontSize:"0.68rem",
                           color:"rgba(255,255,255,0.35)",
                           marginTop:"0.625rem", lineHeight:1.5 }}>
              {deal.note}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:"0.75rem", padding:"0.625rem 0.875rem",
                     borderRadius:5, background:"rgba(255,255,255,0.02)",
                     border:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontFamily:S, fontSize:"0.68rem",
                       color:"rgba(255,255,255,0.3)", lineHeight:1.6 }}>
          Deal pipeline reflects active development. Stages advance as milestones
          are verified and documented on Abraxas Protocol.
        </div>
      </div>
    </div>
  );
}
