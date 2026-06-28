"use client";
// FILE: components/terminal/MusicSection.tsx
// Music royalty audit. Stats strip for credibility + a lightweight
// interactive estimator to give artists a reason to fill out the form.
//
// LIGHT-MODE FIX (June 2026): DeMarkoPhoto and ChancellorPhoto used
// background:"#08090F" (leftover near-black avatar placeholder) — a
// stark black square sitting inside the pastel green/purple/amber
// cards below. D9Gallery, the third avatar component in this same
// file, already correctly uses the light neutral — made the other two
// match it. Also gave the issue-type cards a touch of visible fill
// instead of the near-invisible rgba(255,255,255,0.02).

import { useState, useEffect } from "react";
import { ArtistAuditForm } from "@/components/music/ArtistAuditForm";
import { M, S, G, A, B, W, BDR } from "./tokens";
import { Label, ScrollFade } from "./ui";
import { D9Gallery } from "./D9Gallery";
import { discoverImages } from "@/lib/discoverImages";

// DeMarko's 8 known book-cover photos, tries each, shows whichever
// actually loads instead of hardcoding one file that might be broken
// while the others work fine.
function DeMarkoPhoto() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      `/assets/demarko/${String(i + 1).padStart(3, "0")}.jpg`);
    discoverImages("demarko-music-thumb", candidates).then(found => {
      if (found.length > 0) setSrc(found[0]);
    });
  }, []);
  return (
    <div style={{ width:64, height:64, borderRadius:8, overflow:"hidden",
                   background:"var(--surface-raised, #F4F4F1)", flexShrink:0 }}>
      {src && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="DeMarko Reddins"
             style={{ width:"100%", height:"100%", objectFit:"cover" }} />
      )}
    </div>
  );
}

function ChancellorPhoto() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const candidates = Array.from({ length: 3 }, (_, i) =>
      `/assets/chancellor/${String(i + 1).padStart(4, "0")}.jpg`);
    discoverImages("chancellor-music-thumb", candidates).then(found => {
      if (found.length > 0) setSrc(found[0]);
    });
  }, []);
  return (
    <div style={{ width:64, height:64, borderRadius:8, overflow:"hidden",
                   background:"var(--surface-raised, #F4F4F1)", flexShrink:0 }}>
      {src && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt="Chancellor K. Jackson"
             style={{ width:"100%", height:"100%", objectFit:"cover" }} />
      )}
    </div>
  );
}

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
          Are you missing royalties?
        </div>
        <p style={{ fontFamily:S, fontSize:"0.82rem",
                     color:"rgba(21,21,26,0.5)", lineHeight:1.7,
                     maxWidth:560, margin:"0 0 1.125rem" }}>
          Publishing deals routinely route royalties to the wrong party. Missing ISRCs,
          unregistered compositions, and MLC gaps leave years of income unclaimed.
          Our team finds it, you keep it, no cost to find out.
        </p>
      </div>

      {/* First artist on Abraxas, real consent confirmed before publishing this */}
      <div style={{ padding:"1.125rem", borderRadius:10,
                     background:"rgba(16,185,129,0.07)",
                     border:`1px solid ${G}30`, marginBottom:"0.875rem",
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
                         color:"rgba(21,21,26,0.45)", marginTop:2, marginBottom:"0.5rem" }}>
            Atlanta-based producer, active since 2008. First catalog
            through the Abraxas royalty audit.
          </div>
          <a href="https://music.apple.com/us/artist/d-9-musick/1449871408"
             target="_blank" rel="noopener noreferrer"
             style={{ fontFamily:S, fontSize:"0.7rem", color:G,
                       textDecoration:"underline" }}>
            Listen on Apple Music →
          </a>
        </div>
      </div>

      {/* DeMarko Reddins, literary IP, featured alongside the music audit
          since this section's presentation carries the story better */}
      <div style={{ padding:"1.125rem", borderRadius:10,
                     background:"rgba(139,92,246,0.06)",
                     border:"1px solid rgba(139,92,246,0.3)", marginBottom:"0.875rem",
                     display:"flex", gap:"1rem", flexWrap:"wrap", alignItems:"center" }}>
        <DeMarkoPhoto />
        <div>
          <div style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600,
                         color:"#8B5CF6", marginBottom:"0.25rem" }}>
            Literary IP, Catalog Verified
          </div>
          <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700, color:W }}>
            DeMarko Reddins
          </div>
          <div style={{ fontFamily:S, fontSize:"0.74rem",
                         color:"rgba(21,21,26,0.45)", marginTop:2, marginBottom:"0.5rem" }}>
            Published author, full catalog verified and available through
            Abraxas, ebook and print bundle options.
          </div>
          <a href="/terminal#demo-assets"
             style={{ fontFamily:S, fontSize:"0.7rem", color:"#8B5CF6",
                       textDecoration:"underline" }}>
            View catalog →
          </a>
        </div>
      </div>

      {/* Chancellor K. Jackson, entertainment IP */}
      <div style={{ padding:"1.125rem", borderRadius:10,
                     background:"rgba(245,158,11,0.06)",
                     border:"1px solid rgba(245,158,11,0.3)", marginBottom:"1.25rem",
                     display:"flex", gap:"1rem", flexWrap:"wrap", alignItems:"center" }}>
        <ChancellorPhoto />
        <div>
          <div style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600,
                         color:"#F59E0B", marginBottom:"0.25rem" }}>
            Entertainment IP, Multi-Format Verified
          </div>
          <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700, color:W }}>
            Chancellor K. Jackson
          </div>
          <div style={{ fontFamily:S, fontSize:"0.74rem",
                         color:"rgba(21,21,26,0.45)", marginTop:2, marginBottom:"0.5rem" }}>
            "14 Days in Beijing," a 13-episode TV pilot and 17-episode anime
            treatment, script and rights access available through Abraxas.
          </div>
          <a href="/terminal#demo-assets"
             style={{ fontFamily:S, fontSize:"0.7rem", color:"#F59E0B",
                       textDecoration:"underline" }}>
            View project →
          </a>
        </div>
      </div>

      {/* Issue type breakdown */}
      <div style={{ display:"grid",
                     gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",
                     gap:"0.625rem", marginBottom:"1.25rem" }}>
        {ISSUE_TYPES.map(issue => (
          <div key={issue.label}
            style={{ padding:"0.75rem 0.875rem", borderRadius:6,
                      background:"var(--surface-raised, #F4F4F1)",
                      border:`1px solid ${issue.color}20`,
                      borderTop:`2px solid ${issue.color}` }}>
            <div style={{ fontFamily:M, fontSize:"0.68rem", fontWeight:700,
                           color:W, marginBottom:"0.3rem" }}>
              {issue.label}
            </div>
            <div style={{ fontFamily:S, fontSize:"0.68rem",
                           color:"rgba(21,21,26,0.4)", lineHeight:1.55 }}>
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
                             color:"rgba(21,21,26,0.45)",
                             display:"block", marginBottom:"0.3rem" }}>
              Tracks released: {tracks}
            </label>
            <input type="range" min={5} max={300} value={tracks}
              onChange={e => setTracks(Number(e.target.value))}
              style={{ width:"100%", accentColor:G }} />
          </div>
          <div>
            <label style={{ fontFamily:S, fontSize:"0.68rem",
                             color:"rgba(21,21,26,0.45)",
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
                          color:"rgba(21,21,26,0.3)" }}>
            estimated unclaimed range
          </span>
        </div>
        <div style={{ fontFamily:S, fontSize:"0.62rem",
                       color:"rgba(21,21,26,0.25)", marginTop:"0.5rem" }}>
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
