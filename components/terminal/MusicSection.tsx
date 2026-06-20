"use client";
// FILE: components/terminal/MusicSection.tsx
// Music royalty audit. Stats strip for credibility + a lightweight
// interactive estimator to give artists a reason to fill out the form.

import { useState } from "react";
import { ArtistAuditForm } from "@/components/music/ArtistAuditForm";
import { M, S, G, A, B, W, BDR, CARD } from "./tokens";
import { Label, ScrollFade } from "./ui";
import { D9Gallery } from "./D9Gallery";

const PROOF_STATS = [
  { val:"80+",   label:"Publishing Clients" },
  { val:"3",     label:"Common Gap Types" },
  { val:"$0",    label:"Cost To Audit" },
];

const ISSUE_TYPES = [
  { label:"Missing ISRCs",          color:A, desc:"Tracks not registered with a unique identifier never get matched to royalty payouts." },
  { label:"Unregistered Compositions", color:B, desc:"Publishing splits filed incorrectly route songwriter royalties to the wrong party entirely." },
  { label:"MLC Gaps",               color:G, desc:"Mechanical royalties sit unclaimed at the MLC when catalogs aren't matched to a registered publisher." },
];

export function MusicSection() {
  const [tracks, setTracks]   = useState(50);
  const [years,  setYears]    = useState(3);

  // Simple, clearly-labeled heuristic. Not a guarantee, just a starting estimate.
  const lowEstimate  = tracks * years * 12;
  const highEstimate = tracks * years * 65;

  function fmt(n: number) {
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n}`;
  }

  return (
    <div style={{ marginBottom:"1.5rem" }}>
      <ScrollFade>
      <Label>Music Royalty Audit</Label>
      <div style={{ marginBottom:"1.125rem" }}>
        <div style={{ fontFamily:"Georgia,'Times New Roman',serif",
                       fontSize:"clamp(1.5rem,4vw,2.5rem)", fontWeight:700,
                       color:W, lineHeight:1.15, letterSpacing:"-0.02em",
                       marginBottom:"0.625rem" }}>
          Your catalog is earning money
          <br />
          <span style={{ color:G }}>you have not seen.</span>
        </div>
        <p style={{ fontFamily:S, fontSize:"0.82rem",
                     color:"rgba(255,255,255,0.5)", lineHeight:1.7,
                     maxWidth:560, margin:"0 0 0.875rem" }}>
          Publishing deals routinely route royalties to the wrong party. Missing ISRCs,
          unregistered compositions, and MLC gaps leave years of income unclaimed.
          We work with 80+ publishing clients. Our team finds it. You keep it.
        </p>

        {/* Proof stats strip */}
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",
                       gap:"1px", background:BDR, borderRadius:6,
                       overflow:"hidden" }}>
          {PROOF_STATS.map(s => (
            <div key={s.label} style={{ background:CARD, padding:"0.7rem 0.875rem" }}>
              <div style={{ fontFamily:M, fontSize:"1.1rem",
                             fontWeight:900, color:G }}>{s.val}</div>
              <div style={{ fontFamily:M, fontSize:"0.5rem",
                             color:"rgba(255,255,255,0.3)",
                             textTransform:"uppercase",
                             letterSpacing:"0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* First artist on Abraxas, real consent confirmed before publishing this */}
      <div style={{ padding:"1.125rem", borderRadius:10,
                     background:"linear-gradient(135deg,rgba(16,185,129,0.07),rgba(0,0,0,0))",
                     border:`1px solid ${G}30`, marginBottom:"1.25rem",
                     display:"flex", gap:"1rem", flexWrap:"wrap", alignItems:"center" }}>
        <D9Gallery />
        <div>
          <div style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600,
                         color:G, marginBottom:"0.25rem" }}>
            First Artist on Abraxas
          </div>
          <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700, color:W }}>
            D-9 Musick
          </div>
          <div style={{ fontFamily:S, fontSize:"0.74rem",
                         color:"rgba(255,255,255,0.45)", marginTop:2 }}>
            Atlanta-based producer, active since 2008. First catalog
            through the Abraxas royalty audit.
          </div>
        </div>
      </div>

      {/* Issue type breakdown */}
      <div style={{ display:"grid",
                     gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",
                     gap:"0.625rem", marginBottom:"1.25rem" }}>
        {ISSUE_TYPES.map(issue => (
          <div key={issue.label}
            style={{ padding:"0.75rem 0.875rem", borderRadius:6,
                      background:"rgba(255,255,255,0.02)",
                      border:`1px solid ${issue.color}20`,
                      borderTop:`2px solid ${issue.color}` }}>
            <div style={{ fontFamily:M, fontSize:"0.68rem", fontWeight:700,
                           color:W, marginBottom:"0.3rem" }}>
              {issue.label}
            </div>
            <div style={{ fontFamily:S, fontSize:"0.68rem",
                           color:"rgba(255,255,255,0.4)", lineHeight:1.55 }}>
              {issue.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Interactive estimator */}
      <div style={{ padding:"1rem 1.125rem", borderRadius:8,
                     background:`${G}05`, border:`1px solid ${G}20`,
                     marginBottom:"1.25rem" }}>
        <div style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                       color:G, letterSpacing:"0.12em",
                       textTransform:"uppercase", marginBottom:"0.75rem" }}>
          ESTIMATE YOUR UNCLAIMED RANGE
        </div>
        <div style={{ display:"grid",
                       gridTemplateColumns:"1fr 1fr", gap:"0.875rem",
                       marginBottom:"0.875rem" }}>
          <div>
            <label style={{ fontFamily:S, fontSize:"0.68rem",
                             color:"rgba(255,255,255,0.45)",
                             display:"block", marginBottom:"0.3rem" }}>
              Tracks released: {tracks}
            </label>
            <input type="range" min={5} max={300} value={tracks}
              onChange={e => setTracks(Number(e.target.value))}
              style={{ width:"100%", accentColor:G }} />
          </div>
          <div>
            <label style={{ fontFamily:S, fontSize:"0.68rem",
                             color:"rgba(255,255,255,0.45)",
                             display:"block", marginBottom:"0.3rem" }}>
              Years active: {years}
            </label>
            <input type="range" min={1} max={20} value={years}
              onChange={e => setYears(Number(e.target.value))}
              style={{ width:"100%", accentColor:G }} />
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"baseline",
                       gap:"0.5rem", flexWrap:"wrap" }}>
          <span style={{ fontFamily:M, fontSize:"1.4rem", fontWeight:900,
                          color:G }}>
            {fmt(lowEstimate)} {"\u2013"} {fmt(highEstimate)}
          </span>
          <span style={{ fontFamily:S, fontSize:"0.68rem",
                          color:"rgba(255,255,255,0.3)" }}>
            estimated unclaimed range
          </span>
        </div>
        <div style={{ fontFamily:S, fontSize:"0.62rem",
                       color:"rgba(255,255,255,0.25)", marginTop:"0.5rem" }}>
          A starting estimate based on catalog size and years active. No
          upfront cost: if we find unclaimed royalties, our fee is 20% of
          what's recovered, you keep the other 80%, paid only after funds
          actually come in.
        </div>
      </div>

      <ArtistAuditForm />
      </ScrollFade>
    </div>
  );
}
