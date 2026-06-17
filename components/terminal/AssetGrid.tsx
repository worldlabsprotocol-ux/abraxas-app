"use client";
// FILE: components/terminal/AssetGrid.tsx
// All four registered assets: AAS-1 Cielo, AAS-2 DeMarko, AAS-3 Chancellor, AAS-4 Smyrna.
// One canonical rendering. no duplicates.

import { M, S, G, A, B, W, BDR, CARD, TEAL, RED, IND } from "./tokens";
import { Label, Button, ScrollFade } from "./ui";

interface AssetGridProps {
  onViewRegistry: () => void;
  onInvest: (assetId: string) => void;
}

const CIELO_STATS = [
  { k:"Appraised Value", v:"$1,100,000" },
  { k:"Annual NOI",      v:"$109,500" },
  { k:"Cash Yield",      v:"14.6%" },
  { k:"Collateral Score",v:"89 / 100" },
  { k:"Max Borrow",      v:"$660K USDC" },
  { k:"Cap Rate",        v:"9.95%" },
];

export function AssetGrid({ onViewRegistry, onInvest }: AssetGridProps) {
  return (
    <div style={{ marginBottom:"1.5rem" }}>
      {/* AAS-1: Cielo Sunrise */}
      <ScrollFade>
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
            <Button href="https://www.airbnb.com/rooms/1681387746169197852"
                    variant="outline" color={W} size="sm">
              VIEW PHOTOS
            </Button>
          </div>
        </div>
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
                       gap:"1px", background:BDR }}>
          {CIELO_STATS.map(s => (
            <div key={s.k} style={{ background:CARD, padding:"0.75rem 0.875rem" }}>
              <div style={{ fontFamily:M, fontSize:"0.52rem",
                             color:"rgba(255,255,255,0.3)",
                             textTransform:"uppercase",
                             letterSpacing:"0.1em", marginBottom:3 }}>{s.k}</div>
              <div style={{ fontFamily:M, fontSize:"0.92rem",
                             fontWeight:900, color:G }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"0.875rem 1rem", background:"#08090F",
                       display:"flex", gap:"0.5rem", flexWrap:"wrap",
                       alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
            <Button href="https://www.airbnb.com/rooms/1681387746169197852"
                    variant="outline" color={W} size="md">
              VIEW ON AIRBNB
            </Button>
            <Button onClick={onViewRegistry} variant="outline" color={G} size="md">
              VIEW ASSET RECORD
            </Button>
          </div>
          <Button onClick={() => onInvest("aas-1")} color={G} size="md">
            INVEST →
          </Button>
        </div>
      </div>

      </ScrollFade>

      {/* AAS-2 + AAS-3 + AAS-4 mini cards */}
      <ScrollFade delay={0.1}>
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
            {[
              { k:"Asset Class", v:"Literary IP" },
              { k:"Revenue",     v:"KDP + Distributors" },
              { k:"Rights",      v:"Publishing / Royalties" },
              { k:"Status",      v:"PENDING VERIFICATION" },
            ].map(s => (
              <div key={s.k} style={{ background:CARD, padding:"0.55rem 0.75rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.48rem",
                               color:"rgba(255,255,255,0.25)",
                               textTransform:"uppercase",
                               letterSpacing:"0.1em", marginBottom:2 }}>{s.k}</div>
                <div style={{ fontFamily:M, fontSize:"0.68rem",
                               fontWeight:700, color:IND }}>{s.v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding:"0.625rem 0.875rem", background:"#08090F",
                         display:"flex", gap:"0.5rem", alignItems:"center",
                         justifyContent:"space-between" }}>
            <Button href="https://www.amazon.com/stores/DeMarko-Reddins/author/B00JUA0U0G"
                    variant="outline" color={IND} size="sm">
              VIEW CATALOG
            </Button>
            <Button onClick={() => onInvest("aas-2")} color={IND} size="sm">
              INVEST →
            </Button>
          </div>
        </div>

        {/* AAS-3 Chancellor K. Jackson. 14 Days in Beijing */}
        <div style={{ borderRadius:8, overflow:"hidden",
                       border:`1px solid ${A}55`,
                       background:"linear-gradient(145deg,#140E00 0%,#0C0800 100%)",
                       gridColumn:"span 1" }}>
          {/* Billboard header */}
          <div style={{ padding:"1rem 1rem 0.75rem",
                         borderBottom:`1px solid ${A}20`,
                         background:`linear-gradient(135deg,${A}12,rgba(0,0,0,0))` }}>
            <div style={{ fontFamily:M, fontSize:"0.5rem", fontWeight:700,
                           color:A, letterSpacing:"0.15em",
                           textTransform:"uppercase", marginBottom:"0.375rem" }}>
              AAS-3 · CHANCELLOR K. JACKSON · MULTI-FORMAT IP
            </div>
            <div style={{ fontFamily:"Georgia,serif",
                           fontSize:"clamp(1.2rem,3vw,1.6rem)",
                           fontWeight:700, color:W, lineHeight:1.1,
                           marginBottom:"0.25rem" }}>
              14 Days in Beijing
            </div>
            <div style={{ fontFamily:S, fontSize:"0.68rem",
                           color:"rgba(255,255,255,0.4)", lineHeight:1.5,
                           marginBottom:"0.625rem" }}>
              Completed scripts across multiple formats.
              Series acquisition discussions active with production partners.
            </div>

            {/* Script inventory */}
            <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem",
                           marginBottom:"0.625rem" }}>
              {[
                { label:"TV Pilot. Live Action", detail:"13 episodes · 1 hour per episode · Script complete", color:"#F97316" },
                { label:"Anime Series", detail:"17 episodes · 25 minutes per episode · Script complete", color:"#EC4899" },
              ].map(s => (
                <div key={s.label}
                  style={{ padding:"0.4rem 0.625rem", borderRadius:4,
                            background:`${s.color}08`,
                            border:`1px solid ${s.color}25`,
                            display:"flex", justifyContent:"space-between",
                            alignItems:"center", gap:"0.5rem" }}>
                  <div>
                    <div style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                                   color:s.color, letterSpacing:"0.06em" }}>
                      {s.label}
                    </div>
                    <div style={{ fontFamily:S, fontSize:"0.6rem",
                                   color:"rgba(255,255,255,0.35)" }}>
                      {s.detail}
                    </div>
                  </div>
                  <div style={{ padding:"0.15rem 0.4rem", borderRadius:2,
                                 background:`${s.color}15`,
                                 border:`1px solid ${s.color}30`,
                                 fontFamily:M, fontSize:"0.44rem", fontWeight:700,
                                 color:s.color, letterSpacing:"0.06em",
                                 flexShrink:0, whiteSpace:"nowrap" }}>
                    COMPLETE
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Animated production roadmap */}
          <div style={{ padding:"0.625rem 0.875rem",
                         background:"rgba(245,158,11,0.04)",
                         borderBottom:`1px solid rgba(245,158,11,0.1)` }}>
            <div style={{ fontFamily:M, fontSize:"0.48rem", color:`${A}60`,
                           letterSpacing:"0.12em", textTransform:"uppercase",
                           marginBottom:"0.5rem" }}>
              PRODUCTION ROADMAP
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:0,
                           overflowX:"auto", paddingBottom:"0.25rem" }}>
              {[
                { label:"Script",        status:"done",    color:A },
                { label:"Pilot",         status:"active",  color:"#F97316" },
                { label:"Acquisition",   status:"active",  color:"#F97316" },
                { label:"Animation",     status:"active",  color:"#EC4899" },
                { label:"Live Play",     status:"pending", color:"#8B5CF6" },
                { label:"Distribution",  status:"pending", color:"#3B82F6" },
              ].map((step, i, arr) => (
                <div key={step.label}
                  style={{ display:"flex", alignItems:"center", gap:0,
                            flexShrink:0 }}>
                  <div style={{ display:"flex", flexDirection:"column",
                                 alignItems:"center", gap:"0.2rem" }}>
                    {/* Animated dot */}
                    <div style={{ position:"relative", width:10, height:10 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%",
                                     background: step.status === "done"
                                       ? step.color
                                       : step.status === "active"
                                         ? `${step.color}40`
                                         : "rgba(255,255,255,0.1)",
                                     border: `1.5px solid ${step.status === "pending" ? "rgba(255,255,255,0.15)" : step.color}`,
                                     boxShadow: step.status === "active"
                                       ? `0 0 0 3px ${step.color}20`
                                       : step.status === "done"
                                         ? `0 0 6px ${step.color}60`
                                         : "none",
                                     position:"relative",
                                     animation: step.status === "active"
                                       ? "pulse-dot 1.8s ease-in-out infinite"
                                       : "none" }}/>
                    </div>
                    <div style={{ fontFamily:M, fontSize:"0.42rem",
                                   color: step.status === "pending"
                                     ? "rgba(255,255,255,0.2)"
                                     : step.color,
                                   letterSpacing:"0.04em",
                                   textAlign:"center", whiteSpace:"nowrap" }}>
                      {step.label}
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width:18, height:1, flexShrink:0,
                                   background: i < 2
                                     ? `${A}40`
                                     : "rgba(255,255,255,0.08)",
                                   margin:"0 0 1rem" }} />
                  )}
                </div>
              ))}
            </div>
            <style>{`
              @keyframes pulse-dot {
                0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0.4)}
                50%{box-shadow:0 0 0 5px rgba(249,115,22,0)}
              }
            `}</style>
          </div>

          {/* CTA row */}
          <div style={{ padding:"0.625rem 0.875rem", background:"#08090F",
                         display:"flex", gap:"0.5rem", alignItems:"center",
                         flexWrap:"wrap", justifyContent:"space-between" }}>
            <Button href="https://www.amazon.com/stores/Chancellor-K.-Jackson/author/B086YGY4BM"
                    variant="outline" color={A} size="sm">
              VIEW CATALOG
            </Button>
            <Button onClick={() => onInvest("aas-3")} color={A} size="sm">
              INVEST →
            </Button>
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
            {[
              { k:"Asset Class", v:"Residential RE" },
              { k:"Lien Status", v:"CLEAR. Paid Off" },
              { k:"Max Borrow",  v:"~60% LTV USDC" },
              { k:"Status",      v:"PENDING VERIFICATION" },
            ].map(s => (
              <div key={s.k} style={{ background:CARD, padding:"0.55rem 0.75rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.48rem",
                               color:"rgba(255,255,255,0.25)",
                               textTransform:"uppercase",
                               letterSpacing:"0.1em", marginBottom:2 }}>{s.k}</div>
                <div style={{ fontFamily:M, fontSize:"0.68rem",
                               fontWeight:700, color:TEAL }}>{s.v}</div>
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
            <Button onClick={() => onInvest("aas-4")} color={TEAL} size="sm">
              INVEST →
            </Button>
          </div>
        </div>
      </div>
      </ScrollFade>
    </div>
  );
}
