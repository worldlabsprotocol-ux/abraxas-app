"use client";
// FILE: components/terminal/CloveCaseStudy.tsx
// The single flagship trust story, before the full asset grid. One
// real asset, before/after, instead of six things competing for
// attention on a stranger's first ten seconds on the site.

import { useState, useEffect } from "react";
import { S, G, BDR } from "./tokens";
import { ScrollFade } from "./ui";

const CLOVE_IMAGES = [
  "/assets/worldwearables/theclove.webp",
  "/assets/worldwearables/theclove2.webp",
];

function checkImage(src: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

export function CloveCaseStudy() {
  const [imgOk, setImgOk] = useState(false);

  useEffect(() => {
    checkImage(CLOVE_IMAGES[0]).then(setImgOk);
  }, []);

  return (
    <ScrollFade>
      <div>
        <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                       color:G, marginBottom:"0.625rem" }}>
          One real example
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",
                       gap:"1.25rem" }}>
          {/* BEFORE */}
          <div style={{ padding:"1.25rem", borderRadius:12,
                         border:`1px solid ${BDR}`, background:"rgba(255,255,255,0.02)" }}>
            <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:700,
                           color:"rgba(255,255,255,0.4)", letterSpacing:"0.06em",
                           textTransform:"uppercase", marginBottom:"0.75rem" }}>
              Without Abraxas
            </div>
            <ul style={{ margin:0, padding:0, listStyle:"none",
                          display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {[
                "A listing, some photos, a claim",
                "\"Trust me, I own it\"",
                "No way to check what's actually verified",
                "You decide based on someone's word",
              ].map(line => (
                <li key={line} style={{ fontFamily:S, fontSize:"0.8rem",
                                          color:"rgba(255,255,255,0.5)",
                                          display:"flex", gap:"0.5rem" }}>
                  <span style={{ color:"#EF4444" }}>✕</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* AFTER */}
          <div style={{ padding:"1.25rem", borderRadius:12,
                         border:`1px solid ${G}40`,
                         background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(0,0,0,0))" }}>
            <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:700,
                           color:G, letterSpacing:"0.06em",
                           textTransform:"uppercase", marginBottom:"0.75rem" }}>
              On Abraxas
            </div>
            <ul style={{ margin:0, padding:0, listStyle:"none",
                          display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {[
                "Real photos, a real construction timeline",
                "Purchase date, ownership status, on record",
                "What's verified marked clearly, what isn't too",
                "You decide based on actual evidence",
              ].map(line => (
                <li key={line} style={{ fontFamily:S, fontSize:"0.8rem",
                                          color:"rgba(255,255,255,0.7)",
                                          display:"flex", gap:"0.5rem" }}>
                  <span style={{ color:G }}>✓</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {imgOk && (
          <div style={{ marginTop:"1.25rem", borderRadius:12, overflow:"hidden",
                         maxHeight:280 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CLOVE_IMAGES[0]} alt="The Clove"
                 style={{ width:"100%", height:280, objectFit:"cover" }} />
          </div>
        )}

        <p style={{ fontFamily:S, fontSize:"0.82rem",
                     color:"rgba(255,255,255,0.5)", lineHeight:1.7,
                     marginTop:"1.25rem", maxWidth:560 }}>
          The Clove is a real villa, purchased in 2023, built from the
          ground up with a documented construction journey, sold out
          today. Not a pitch deck, an actual asset with an actual paper
          trail. This is what "verified" means in practice, not a feature
          on a list, an asset you can actually look into.
        </p>
      </div>
    </ScrollFade>
  );
}
