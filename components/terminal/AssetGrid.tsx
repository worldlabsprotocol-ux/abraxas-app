"use client";
// FILE: components/terminal/AssetGrid.tsx
// All four registered assets: AAS-1 Cielo, AAS-2 DeMarko, AAS-3 Chancellor, AAS-4 Smyrna.
// One canonical rendering — no duplicates.

import { M, S, G, A, B, W, BDR, CARD, TEAL, RED, IND } from "./tokens";
import { Label } from "./ui";

interface AssetGridProps {
  onViewRegistry: () => void;
  onViewAsset: () => void;
  onSubmit: () => void;
}

const CIELO_STATS = [
  ["Appraised Value", "$1,100,000"],
  ["Annual NOI",      "$109,500"],
  ["Cash Yield",      "14.6%"],
  ["Collateral Score","89 / 100"],
  ["Max Borrow",      "$660K USDC"],
  ["Cap Rate",        "9.95%"],
];

export function AssetGrid({ onViewRegistry, onViewAsset, onSubmit }: AssetGridProps) {
  return (
    <div style={{ marginBottom:"1.5rem" }}>
      {/* AAS-1: Cielo Sunrise */}
      <Label>Genesis Asset · AAS-1</Label>
      <div style={{ borderRadius:8, overflow:"hidden",
                     border:`1px solid ${G}35`, marginBottom:"1.5rem" }}>
        <div style={{ height:"clamp(200px,35vw,300px)",
                       background:"linear-gradient(160deg,#0a1a0f 0%,#0d2318 25%,#112b1e 50%,#0a1a12 75%,#061008 100%)",
                       position:"relative", overflow:"hidden" }}>
          <svg viewBox="0 0 1200 320"
            style={{ position:"absolute", bottom:0, left:0,
                      width:"100%", height:"100%", opacity:0.6 }}
            preserveAspectRatio="none">
            <path d="M0,320 L0,200 L120,140 L200,160 L280,100 L380,130 L460,80 L540,110 L620,60 L700,90 L780,50 L860,80 L940,40 L1020,70 L1100,50 L1200,80 L1200,320 Z"
              fill="rgba(16,185,129,0.08)" />
            <path d="M0,320 L0,240 L100,190 L200,210 L300,160 L400,185 L500,140 L600,165 L700,120 L800,150 L900,110 L1000,140 L1100,120 L1200,140 L1200,320 Z"
              fill="rgba(16,185,129,0.12)" />
          </svg>
          <div style={{ position:"absolute", bottom:0, left:0, right:0,
                         background:"linear-gradient(transparent,rgba(4,6,8,0.95))",
                         padding:"2rem 1.25rem 1rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.58rem", color:G, fontWeight:700,
                           letterSpacing:"0.15em", textTransform:"uppercase",
                           marginBottom:4 }}>
              AAS-1 · VERIFIED · COLLATERAL ELIGIBLE
            </div>
            <div style={{ fontFamily:"Georgia,serif",
                           fontSize:"clamp(1.1rem,3vw,1.6rem)",
                           fontWeight:700, color:W, lineHeight:1.2, marginBottom:4 }}>
              Cielo Sunrise
            </div>
            <div style={{ fontFamily:S, fontSize:"0.75rem",
                           color:"rgba(255,255,255,0.5)" }}>
              Private Mountain Wellness Retreat · Mineral Bluff, Georgia
            </div>
          </div>
          <div style={{ position:"absolute", top:12, right:12 }}>
            <a href="https://www.airbnb.com/rooms/1681387746169197852"
               target="_blank" rel="noopener noreferrer"
               style={{ display:"inline-block", padding:"0.3rem 0.625rem",
                         borderRadius:4, background:"rgba(0,0,0,0.7)",
                         border:"1px solid rgba(255,255,255,0.15)",
                         fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                         color:W, textDecoration:"none",
                         letterSpacing:"0.06em", textTransform:"uppercase" }}>
              VIEW PHOTOS
            </a>
          </div>
        </div>
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
                       gap:"1px", background:BDR }}>
          {CIELO_STATS.map(([k, v]) => (
            <div key={k} style={{ background:CARD, padding:"0.75rem 0.875rem" }}>
              <div style={{ fontFamily:M, fontSize:"0.52rem",
                             color:"rgba(255,255,255,0.3)",
                             textTransform:"uppercase",
                             letterSpacing:"0.1em", marginBottom:3 }}>{k}</div>
              <div style={{ fontFamily:M, fontSize:"0.92rem",
                             fontWeight:900, color:G }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"0.875rem 1rem", background:"#08090F",
                       display:"flex", gap:"0.5rem", flexWrap:"wrap",
                       alignItems:"center" }}>
          <a href="https://www.airbnb.com/rooms/1681387746169197852"
             target="_blank" rel="noopener noreferrer"
             style={{ padding:"0.5rem 0.875rem", borderRadius:5,
                       border:`1px solid ${BDR}`, background:"transparent",
                       color:"rgba(255,255,255,0.5)", fontFamily:M,
                       fontSize:"0.65rem", fontWeight:700,
                       textDecoration:"none", textTransform:"uppercase",
                       letterSpacing:"0.08em" }}>
            VIEW ON AIRBNB
          </a>
          <button onClick={onViewRegistry}
            style={{ padding:"0.5rem 0.875rem", borderRadius:5,
                      border:`1px solid ${G}40`, background:`${G}10`,
                      color:G, fontFamily:M, fontSize:"0.65rem", fontWeight:700,
                      cursor:"pointer", textTransform:"uppercase",
                      letterSpacing:"0.08em" }}>
            VIEW ASSET RECORD
          </button>
          <button onClick={onSubmit}
            style={{ padding:"0.5rem 0.875rem", borderRadius:5, border:"none",
                      background:G, color:"#000", fontFamily:M,
                      fontSize:"0.65rem", fontWeight:900, cursor:"pointer",
                      textTransform:"uppercase", letterSpacing:"0.08em",
                      marginLeft:"auto" }}>
            SUBMIT YOUR ASSET
          </button>
        </div>
      </div>

      {/* AAS-2 + AAS-3 + AAS-4 mini cards */}
      <div style={{ display:"grid",
                     gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",
                     gap:"0.75rem" }}>

        {/* AAS-2 DeMarko Reddins */}
        <div style={{ borderRadius:8, overflow:"hidden",
                       border:`1px solid ${IND}50`,
                       background:"linear-gradient(145deg,#0C0E20 0%,#0A0C1A 100%)" }}>
          <div style={{ padding:"0.875rem 1rem",
                         borderBottom:`1px solid ${IND}20`,
                         background:`linear-gradient(135deg,rgba(99,102,241,0.12),rgba(0,0,0,0))` }}>
            <div style={{ fontFamily:M, fontSize:"0.52rem", fontWeight:700,
                           color:IND, letterSpacing:"0.15em",
                           textTransform:"uppercase", marginBottom:"0.375rem" }}>
              AAS-2 · LITERARY IP · PUBLISHING RIGHTS
            </div>
            <div style={{ fontFamily:"Georgia,serif",
                           fontSize:"clamp(1rem,2.5vw,1.25rem)",
                           fontWeight:700, color:W, marginBottom:"0.25rem" }}>
              DeMarko Reddins
            </div>
            <div style={{ fontFamily:S, fontSize:"0.7rem",
                           color:"rgba(255,255,255,0.4)", lineHeight:1.55 }}>
              Published author catalog · KDP royalty streams · Multi-title publishing rights
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                         gap:"1px", background:BDR }}>
            {[["Asset Class","Literary IP"],["Revenue","KDP + Distributors"],
              ["Rights","Publishing / Royalties"],["Status","PENDING VERIFICATION"]
            ].map(([k, v]) => (
              <div key={k} style={{ background:CARD, padding:"0.55rem 0.75rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.48rem",
                               color:"rgba(255,255,255,0.25)",
                               textTransform:"uppercase",
                               letterSpacing:"0.1em", marginBottom:2 }}>{k}</div>
                <div style={{ fontFamily:M, fontSize:"0.68rem",
                               fontWeight:700, color:IND }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding:"0.625rem 0.875rem", background:"#08090F",
                         display:"flex", gap:"0.5rem", alignItems:"center" }}>
            <a href="https://www.amazon.com/stores/DeMarko-Reddins/author/B00JUA0U0G"
               target="_blank" rel="noopener noreferrer"
               style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                         color:IND, textDecoration:"none",
                         letterSpacing:"0.06em", textTransform:"uppercase" }}>
              VIEW CATALOG
            </a>
            <button onClick={onSubmit}
              style={{ marginLeft:"auto", padding:"0.35rem 0.75rem",
                        borderRadius:4, border:"none",
                        background:IND, color:"#fff", fontFamily:M,
                        fontSize:"0.58rem", fontWeight:900, cursor:"pointer",
                        textTransform:"uppercase", letterSpacing:"0.06em" }}>
              TOKENIZE
            </button>
          </div>
        </div>

        {/* AAS-3 Chancellor K. Jackson */}
        <div style={{ borderRadius:8, overflow:"hidden",
                       border:`1px solid ${A}55`,
                       background:"linear-gradient(145deg,#140E00 0%,#0C0800 100%)" }}>
          <div style={{ padding:"0.875rem 1rem",
                         borderBottom:`1px solid ${A}25`,
                         background:`linear-gradient(135deg,${A}15,rgba(0,0,0,0))` }}>
            <div style={{ fontFamily:M, fontSize:"0.52rem", fontWeight:700,
                           color:A, letterSpacing:"0.15em",
                           textTransform:"uppercase", marginBottom:"0.375rem" }}>
              AAS-3 · MULTI-FORMAT IP · ACTIVE PRODUCTION
            </div>
            <div style={{ fontFamily:"Georgia,serif",
                           fontSize:"clamp(1rem,2.5vw,1.25rem)",
                           fontWeight:700, color:W, marginBottom:"0.25rem" }}>
              14 Days in Beijing
            </div>
            <div style={{ fontFamily:S, fontSize:"0.7rem",
                           color:"rgba(255,255,255,0.4)", lineHeight:1.55 }}>
              Chancellor K. Jackson · TV/film talks · Anime in dev · Live play · Funding active
            </div>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"0.25rem",
                         padding:"0.5rem 0.75rem",
                         background:"rgba(245,158,11,0.05)" }}>
            {["TV / Film · IN TALKS","Anime · IN DEV",
              "Live Play · IN PROGRESS","Funding · ACTIVE"
            ].map(tag => (
              <div key={tag}
                style={{ padding:"0.2rem 0.5rem", borderRadius:3,
                          background:`${A}10`, border:`1px solid ${A}30`,
                          fontFamily:M, fontSize:"0.48rem",
                          color:W, letterSpacing:"0.04em" }}>
                {tag}
              </div>
            ))}
          </div>
          <div style={{ padding:"0.625rem 0.875rem", background:"#08090F",
                         display:"flex", gap:"0.5rem", alignItems:"center" }}>
            <a href="https://www.amazon.com/stores/Chancellor-K.-Jackson/author/B086YGY4BM"
               target="_blank" rel="noopener noreferrer"
               style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                         color:A, textDecoration:"none",
                         letterSpacing:"0.06em", textTransform:"uppercase" }}>
              VIEW CATALOG
            </a>
            <button onClick={onSubmit}
              style={{ marginLeft:"auto", padding:"0.35rem 0.75rem",
                        borderRadius:4, border:"none",
                        background:A, color:"#000", fontFamily:M,
                        fontSize:"0.58rem", fontWeight:900, cursor:"pointer",
                        textTransform:"uppercase", letterSpacing:"0.06em" }}>
              TOKENIZE
            </button>
          </div>
        </div>

        {/* AAS-4 Smyrna Townhome */}
        <div style={{ borderRadius:8, overflow:"hidden",
                       border:`1px solid ${TEAL}55`,
                       background:"linear-gradient(145deg,#001820 0%,#000F16 100%)" }}>
          <div style={{ padding:"0.875rem 1rem",
                         borderBottom:`1px solid ${TEAL}20`,
                         background:`linear-gradient(135deg,${TEAL}12,rgba(0,0,0,0))` }}>
            <div style={{ fontFamily:M, fontSize:"0.52rem", fontWeight:700,
                           color:TEAL, letterSpacing:"0.15em",
                           textTransform:"uppercase", marginBottom:"0.375rem" }}>
              AAS-4 · REAL ESTATE · INVESTOR PARTICIPATION OPEN
            </div>
            <div style={{ fontFamily:"Georgia,serif",
                           fontSize:"clamp(1rem,2.5vw,1.25rem)",
                           fontWeight:700, color:W, marginBottom:"0.25rem" }}>
              Smyrna Townhome
            </div>
            <div style={{ fontFamily:S, fontSize:"0.7rem",
                           color:"rgba(255,255,255,0.4)", lineHeight:1.55 }}>
              Smyrna, GA · 6 min from Truist Park · Paid off · Chancellor K. Jackson, owner
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                         gap:"1px", background:BDR }}>
            {[["Asset Class","Residential RE"],["Lien Status","CLEAR — Paid Off"],
              ["Max Borrow","~60% LTV USDC"],["Status","PENDING VERIFICATION"]
            ].map(([k, v]) => (
              <div key={k} style={{ background:CARD, padding:"0.55rem 0.75rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.48rem",
                               color:"rgba(255,255,255,0.25)",
                               textTransform:"uppercase",
                               letterSpacing:"0.1em", marginBottom:2 }}>{k}</div>
                <div style={{ fontFamily:M, fontSize:"0.68rem",
                               fontWeight:700, color:TEAL }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding:"0.625rem 0.875rem", background:"#08090F",
                         display:"flex", gap:"0.5rem", alignItems:"center" }}>
            <div style={{ padding:"0.2rem 0.5rem", borderRadius:3,
                           background:`${TEAL}12`, border:`1px solid ${TEAL}30`,
                           fontFamily:M, fontSize:"0.5rem", fontWeight:700,
                           color:TEAL, letterSpacing:"0.06em" }}>
              INVESTOR OPEN
            </div>
            <button onClick={onSubmit}
              style={{ marginLeft:"auto", padding:"0.35rem 0.75rem",
                        borderRadius:4, border:"none",
                        background:TEAL, color:"#000", fontFamily:M,
                        fontSize:"0.58rem", fontWeight:900, cursor:"pointer",
                        textTransform:"uppercase", letterSpacing:"0.06em" }}>
              TOKENIZE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
