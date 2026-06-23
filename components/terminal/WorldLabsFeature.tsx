"use client";
// FILE: components/terminal/WorldLabsFeature.tsx
// Two genuinely standalone exports now, not one card with a sub-card
// nested inside it. World Labs is the proof-of-concept business case
// study. World Wearables is a completely separate product line, no
// longer visually nested under or beside World Labs.

import { useState } from "react";
import { S, G, W, BDR } from "./tokens";
import type { BuyItem } from "./BuyNowModal";

const LOGO_CANDIDATES = [
  "/assets/worldwearables/world.jpg", "/assets/worldwearables/world.png",
  "/assets/worldwearables/00001.jpg", "/assets/worldwearables/00001.png",
];

// World Book, literary IP under World Labs, file moved here per request.
const WORLDBOOK_CANDIDATES = [
  "/assets/worldwearables/001.jpg", "/assets/worldwearables/0001.jpg",
];

const HOODIE_CANDIDATES = [
  "/assets/worldwearables/00111.png", "/assets/worldwearables/0111.png",
  "/assets/worldwearables/111.png",   "/assets/worldwearables/00111.jpg",
];

const LINKEDIN_URL: string | null = "https://www.linkedin.com/company/worldlabsprotocol/";
const OPENSEA_URL: string | null = "https://opensea.io/collection/world-labs";

function CascadingImage({ candidates, alt }: { candidates: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const [exhausted, setExhausted] = useState(false);
  if (exhausted) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={candidates[idx]} alt={alt}
         style={{ width:"100%", height:"100%", objectFit:"cover",
                   position:"absolute", inset:0 }}
         onError={() => {
           if (idx + 1 < candidates.length) setIdx(i => i + 1);
           else setExhausted(true);
         }} />
  );
}

// STANDALONE: World Labs, the first tokenized business, proof of concept.
interface WorldLabsSectionProps {
  onBuyNow: (item: BuyItem) => void;
}

export function WorldLabsSection({ onBuyNow }: WorldLabsSectionProps) {
  return (
    <div style={{ borderRadius:12, overflow:"hidden",
                   border:`1px solid ${G}40`,
                   background:"linear-gradient(135deg,rgba(16,185,129,0.08),rgba(0,0,0,0))" }}>
      <div style={{ display:"flex", flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 240px", minHeight:220, position:"relative",
                       background:"#08090F" }}>
          <CascadingImage candidates={LOGO_CANDIDATES} alt="World Labs" />
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

      {/* World Book, literary IP under World Labs, live and buyable in USDT */}
      <div style={{ padding:"1.125rem 1.5rem", borderTop:`1px solid ${BDR}`,
                     display:"flex", gap:"1rem", flexWrap:"wrap",
                     alignItems:"center" }}>
        <div style={{ width:56, height:72, borderRadius:6, overflow:"hidden",
                       position:"relative", background:"#08090F",
                       flexShrink:0 }}>
          <CascadingImage candidates={WORLDBOOK_CANDIDATES} alt="World Book" />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600,
                         color:G, marginBottom:"0.2rem" }}>
            World Labs · Literary IP
          </div>
          <div style={{ display:"flex", alignItems:"baseline", gap:"0.5rem", flexWrap:"wrap" }}>
            <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700, color:W }}>
              The World Book
            </span>
            <span style={{ fontFamily:S, fontSize:"0.8rem", fontWeight:700, color:G }}>
              $1.99
            </span>
          </div>
          <div style={{ fontFamily:S, fontSize:"0.7rem",
                         color:"rgba(255,255,255,0.4)", marginTop:2, marginBottom:"0.625rem" }}>
            Part of the World Labs IP portfolio. Instant digital access after payment.
          </div>
          <button onClick={() => onBuyNow({
              id: "world-book",
              name: "The World Book",
              price: "$1.99",
              description: "Instant digital access to The World Book, part of the World Labs IP portfolio.",
              color: G,
            })}
            style={{ padding:"0.45rem 1.1rem", borderRadius:7, border:"none",
                      background:G, color:"#000", fontFamily:S,
                      fontSize:"0.74rem", fontWeight:700, cursor:"pointer" }}>
            Buy in USDT →
          </button>
        </div>
      </div>
    </div>
  );
}

interface WorldWearablesSectionProps {
  onBuyNow: (item: BuyItem) => void;
}

// STANDALONE: World Wearables, a real product line, separate from
// World Labs entirely, not nested inside it.
export function WorldWearablesSection({ onBuyNow }: WorldWearablesSectionProps) {
  return (
    <div style={{ borderRadius:12, overflow:"hidden",
                   border:`1px solid ${BDR}`, background:"#0A0C10",
                   display:"flex", flexWrap:"wrap" }}>
      <div style={{ flex:"1 1 140px", minHeight:140, maxWidth:180,
                     position:"relative", background:"#08090F" }}>
        <CascadingImage candidates={HOODIE_CANDIDATES} alt="World Labs Hoodie" />
      </div>
      <div style={{ flex:"2 1 240px", padding:"1.125rem 1.25rem",
                     display:"flex", flexDirection:"column",
                     justifyContent:"center" }}>
        <div style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600,
                       color:G, marginBottom:"0.25rem" }}>
          World Wearables
        </div>
        <div style={{ display:"flex", alignItems:"baseline", gap:"0.625rem",
                       marginBottom:"0.5rem", flexWrap:"wrap" }}>
          <span style={{ fontFamily:S, fontSize:"1rem", fontWeight:700, color:W }}>
            World Labs Hoodie
          </span>
          <span style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700, color:G }}>
            $65.00
          </span>
        </div>
        <p style={{ fontFamily:S, fontSize:"0.74rem",
                     color:"rgba(255,255,255,0.45)", lineHeight:1.6,
                     margin:"0 0 0.875rem", maxWidth:420 }}>
          Real apparel, one physical item per purchase, with an on-chain
          record proving authenticity and ownership. Pay in USDT, we
          ship the actual item.
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
                    fontSize:"0.8rem", fontWeight:700, cursor:"pointer",
                    alignSelf:"flex-start" }}>
          Buy the Hoodie, USDT →
        </button>
      </div>
    </div>
  );
}
