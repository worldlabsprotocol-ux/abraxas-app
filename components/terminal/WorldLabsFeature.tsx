"use client";
// FILE: components/terminal/WorldLabsFeature.tsx
// World Labs, the first tokenized business on Abraxas. Founder's own
// company, used as proof of concept: if the founder will put his own
// company through this process first, that's the strongest possible
// signal to other business owners considering the same thing.
//
// IMAGE NOT SHOWING: this tries several common filename patterns
// automatically (00001.jpg, 01.jpg, 0001.jpg, 1.jpg, plus .png/.webp
// versions). If none of those match what you actually uploaded to
// /public/assets/worldlabs/, run `ls public/assets/worldlabs/` in your
// terminal and send the exact output, that's the fastest way to fix
// this for good instead of guessing again.

import { useState } from "react";
import { S, G, W, BDR } from "./tokens";

const WORLDLABS_CANDIDATES = [
  "/assets/worldlabs/00001.jpg", "/assets/worldlabs/01.jpg",
  "/assets/worldlabs/0001.jpg",  "/assets/worldlabs/1.jpg",
  "/assets/worldlabs/00001.png", "/assets/worldlabs/01.png",
  "/assets/worldlabs/00001.webp","/assets/worldlabs/01.webp",
];

// Fill these in once you send them, leave null until then, the
// component honestly hides the button rather than link to nothing.
const LINKEDIN_URL: string | null = "https://www.linkedin.com/company/worldlabsprotocol/";
const OPENSEA_URL: string | null = "https://opensea.io/collection/world-labs";

export function WorldLabsFeature() {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  function tryNext() {
    if (candidateIndex + 1 < WORLDLABS_CANDIDATES.length) {
      setCandidateIndex(i => i + 1);
    } else {
      setExhausted(true);
    }
  }

  return (
    <div style={{ borderRadius:12, overflow:"hidden",
                   border:`1px solid ${G}40`,
                   background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(0,0,0,0))",
                   marginBottom:"1.25rem" }}>
      <div style={{ display:"flex", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 240px", minHeight:180, position:"relative",
                       background:"#08090F" }}>
          {!exhausted && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={WORLDLABS_CANDIDATES[candidateIndex]} alt="World Labs"
                 style={{ width:"100%", height:"100%", objectFit:"cover",
                           position:"absolute", inset:0 }}
                 onError={tryNext} />
          )}
        </div>
        <div style={{ flex:"2 1 320px", padding:"1.25rem 1.5rem" }}>
          <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                         color:G, marginBottom:"0.5rem" }}>
            First Tokenized Business on Abraxas
          </div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:"clamp(1.1rem,2.5vw,1.4rem)",
                         fontWeight:700, color:W, marginBottom:"0.625rem" }}>
            World Labs
          </div>
          <p style={{ fontFamily:S, fontSize:"0.8rem",
                       color:"rgba(255,255,255,0.5)", lineHeight:1.7,
                       margin:"0 0 1rem" }}>
            World Labs is the blueprint Abraxas is built on. Its IP was
            minted on Ethereum in 2023, using smart contracts, before
            "tokenize your business" was a phrase most people had heard.
            Putting World Labs through Abraxas first isn't a marketing
            exercise, it's the same standard every other business on the
            platform will be held to, proven on the founder's own company
            before anyone else's.
          </p>
          <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
            {LINKEDIN_URL && (
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer"
                style={{ padding:"0.5rem 1rem", borderRadius:8,
                          border:`1px solid ${BDR}`, color:"rgba(255,255,255,0.6)",
                          fontFamily:S, fontSize:"0.76rem", fontWeight:600,
                          textDecoration:"none" }}>
                View LinkedIn
              </a>
            )}
            {OPENSEA_URL && (
              <a href={OPENSEA_URL} target="_blank" rel="noopener noreferrer"
                style={{ padding:"0.5rem 1rem", borderRadius:8,
                          border:`1px solid ${BDR}`, color:"rgba(255,255,255,0.6)",
                          fontFamily:S, fontSize:"0.76rem", fontWeight:600,
                          textDecoration:"none" }}>
                View 2023 Ethereum Mint
              </a>
            )}
          </div>
        </div>
      </div>

      {/* World Wearables, real product output from World Labs, not a
          separate investable asset, proof the company makes real things */}
      <WorldWearablesStrip />
    </div>
  );
}

function WorldWearablesStrip() {
  const candidates = [
    "/assets/worldwearables/00111.png", "/assets/worldwearables/0111.png",
    "/assets/worldwearables/111.png",   "/assets/worldwearables/00111.jpg",
  ];
  const [idx, setIdx] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  function tryNext() {
    if (idx + 1 < candidates.length) setIdx(i => i + 1);
    else setExhausted(true);
  }

  return (
    <div style={{ display:"flex", alignItems:"center", gap:"1rem",
                   padding:"1rem 1.5rem", borderTop:`1px solid ${BDR}`,
                   flexWrap:"wrap" }}>
      {!exhausted && (
        <div style={{ width:64, height:64, borderRadius:8, overflow:"hidden",
                       background:"#08090F", flexShrink:0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={candidates[idx]} alt="World Wearables"
               style={{ width:"100%", height:"100%", objectFit:"cover" }}
               onError={tryNext} />
        </div>
      )}
      <div>
        <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:600,
                       color:G, marginBottom:"0.2rem" }}>
          World Wearables · 2023 vintage design
        </div>
        <div style={{ fontFamily:S, fontSize:"0.74rem",
                       color:"rgba(255,255,255,0.45)" }}>
          A real product line under World Labs, not a separate investable
          asset, evidence the company produces real things, not just IP on paper.
        </div>
      </div>
    </div>
  );
}
