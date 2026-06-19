"use client";
// FILE: components/terminal/WorldLabsFeature.tsx
// World Labs — the first tokenized business on Abraxas. Founder's own
// company, used as proof of concept: if the founder will put his own
// company through this process first, that's the strongest possible
// signal to other business owners considering the same thing.
//
// STILL NEEDED FROM YOU:
//   1. Real artwork filename(s) — placeholder below assumes
//      /public/assets/worldlabs/01.jpg. Confirm or rename to match
//      whatever you actually uploaded.
//   2. LinkedIn URL — for the credibility/proof-of-work link
//   3. OpenSea URL — for the existing 2023 Ethereum NFT mint
//   Once you send these, one more small edit wires them in. Until
//   then the LinkedIn/OpenSea buttons are simply not rendered, never
//   shown as broken or fake links.

import { S, G, W, BDR } from "./tokens";

// Adjust this filename to match exactly what you uploaded.
const WORLDLABS_IMAGE = "/assets/worldlabs/01.jpg";

// Fill these in once you send them — leave null until then, the
// component honestly hides the button rather than link to nothing.
const LINKEDIN_URL: string | null = null;
const OPENSEA_URL: string | null = null;

export function WorldLabsFeature() {
  return (
    <div style={{ borderRadius:12, overflow:"hidden",
                   border:`1px solid ${G}40`,
                   background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(0,0,0,0))",
                   marginBottom:"1.25rem" }}>
      <div style={{ display:"flex", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 240px", minHeight:180, position:"relative",
                       background:"#08090F" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={WORLDLABS_IMAGE} alt="World Labs"
               style={{ width:"100%", height:"100%", objectFit:"cover",
                         position:"absolute", inset:0 }}
               onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
            World Labs is the founder's own company, put through the
            Abraxas formation process first. Its IP was already minted
            on Ethereum in 2023 using smart contracts, this isn't a new
            idea for the founder, it's a continuation of work already
            proven on-chain. World Labs going through Abraxas is the
            real-world proof of concept before any outside business does.
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
    </div>
  );
}
