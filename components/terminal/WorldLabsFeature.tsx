"use client";
// FILE: components/terminal/WorldLabsFeature.tsx
// World Labs, the first tokenized business on Abraxas, AND the
// introduction of tokenized wearables: real physical items, 1:1 with
// an on-chain record, similar to the phygital merch pattern that came
// out of the 2020 NFT/metaverse wave, applied to actual product you
// can wear, not just a collectible.

import { useState } from "react";
import { S, G, W, BDR } from "./tokens";
import type { BuyItem } from "./BuyNowModal";

// The hoodie photo is the working image, used as the primary World
// Labs visual now instead of a separate logo file that wasn't loading.
const HOODIE_CANDIDATES = [
  "/assets/worldwearables/00111.png", "/assets/worldwearables/0111.png",
  "/assets/worldwearables/111.png",   "/assets/worldwearables/00111.jpg",
];

// Fill these in once you send them, leave null until then, the
// component honestly hides the button rather than link to nothing.
const LINKEDIN_URL: string | null = "https://www.linkedin.com/company/worldlabsprotocol/";
const OPENSEA_URL: string | null = "https://opensea.io/collection/world-labs";

interface WorldLabsFeatureProps {
  onBuyNow: (item: BuyItem) => void;
}

export function WorldLabsFeature({ onBuyNow }: WorldLabsFeatureProps) {
  const [idx, setIdx] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  function tryNext() {
    if (idx + 1 < HOODIE_CANDIDATES.length) setIdx(i => i + 1);
    else setExhausted(true);
  }

  return (
    <div style={{ borderRadius:12, overflow:"hidden",
                   border:`1px solid ${G}40`,
                   background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(0,0,0,0))",
                   marginBottom:"1.25rem" }}>
      <div style={{ display:"flex", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 240px", minHeight:220, position:"relative",
                       background:"#08090F" }}>
          {!exhausted && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={HOODIE_CANDIDATES[idx]} alt="World Labs"
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

      {/* World Wearables: real physical items, 1:1 with an on-chain
          record. You buy the actual hoodie, the on-chain side proves
          it's authentic and tracks ownership, similar in spirit to the
          phygital merch pattern that came out of the 2020 NFT and
          metaverse wave, applied here to product you actually wear. */}
      <div style={{ padding:"1.25rem 1.5rem", borderTop:`1px solid ${BDR}` }}>
        <div style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:700,
                       color:W, marginBottom:"0.375rem" }}>
          World Wearables
        </div>
        <p style={{ fontFamily:S, fontSize:"0.76rem",
                     color:"rgba(255,255,255,0.45)", lineHeight:1.65,
                     margin:"0 0 0.875rem", maxWidth:480 }}>
          Real World Labs apparel, one physical item per purchase, with an
          on-chain record proving authenticity and ownership. Pay in USDT,
          we ship the actual item.
        </p>
        <button onClick={() => onBuyNow({
            id: "world-wearables-hoodie",
            name: "World Labs Hoodie",
            price: "$65.00",
            description: "One physical hoodie, shipped to you, with an on-chain record of authenticity and ownership tied to this specific item.",
            color: G,
          })}
          style={{ padding:"0.6rem 1.25rem", borderRadius:8, border:"none",
                    background:G, color:"#000", fontFamily:S,
                    fontSize:"0.8rem", fontWeight:700, cursor:"pointer" }}>
          Buy the Hoodie, USDT →
        </button>
      </div>
    </div>
  );
}
