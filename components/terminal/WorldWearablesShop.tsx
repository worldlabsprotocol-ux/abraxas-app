"use client";
// FILE: components/terminal/WorldWearablesShop.tsx
// Two fully separate exports now: the photo gallery (no pricing, just
// the collection) and the hoodie (the one priced, buyable item), no
// longer nested together in one component.
//
// LIGHT-MODE FIX (June 2026): swapped the #000 photo letterbox for the
// same light neutral used in AssetGallery/BluPearlConstruction, for
// consistency across every photo component on the site.

import { useState, useEffect } from "react";
import { S, G, BDR } from "./tokens";
import type { BuyItem } from "./BuyNowModal";
import { discoverImages, selfConcatFilenames } from "@/lib/discoverImages";

const EXCLUDED_FILES = new Set(["1616.jpg"]); // D-9's photo, lives in this folder but shown only in Music

const WEARABLES_IMAGES: string[] = selfConcatFilenames("/assets/worldwearables", 25)
  .filter(path => !EXCLUDED_FILES.has(path.split("/").pop()!));

// STANDALONE: just the photo collection, no pricing.
export function WorldWearablesGallery() {
  const [images, setImages] = useState<string[] | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    discoverImages("world-wearables-gallery", WEARABLES_IMAGES).then(setImages);
  }, []);

  if (images === null) {
    return (
      <div>
        <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                       color:"#15151A", marginBottom:"0.375rem" }}>
          World Wearables
        </div>
        <div style={{ width:"100%", height:280, borderRadius:10,
                       background:"var(--surface-raised)", border:`1px solid ${BDR}`,
                       display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontFamily:S, fontSize:"0.74rem", color:"rgba(242,246,243,0.4)" }}>
            Loading the collection…
          </span>
        </div>
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <div>
      <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                     color:"#15151A", marginBottom:"0.375rem" }}>
        World Wearables
      </div>
      <div style={{ fontFamily:S, fontSize:"0.78rem",
                     color:"rgba(242,246,243,0.45)", marginBottom:"1.25rem" }}>
        The collection so far.
      </div>
      <div style={{ width:"100%", minHeight:280, maxHeight:480,
                     borderRadius:10, overflow:"hidden",
                     background:"var(--surface-raised, #F4F4F1)",
                     display:"flex", alignItems:"center", justifyContent:"center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active]} alt="World Wearables"
             style={{ width:"100%", height:"100%", maxHeight:480, objectFit:"contain" }} />
      </div>
      {images.length > 1 && (
        <div style={{ display:"flex", gap:"0.375rem", marginTop:"0.5rem", overflowX:"auto" }}>
          {images.map((img, i) => (
            <button key={img} onClick={() => setActive(i)}
              style={{ width:56, height:42, borderRadius:5, overflow:"hidden",
                        border: i === active ? `2px solid ${G}` : "2px solid transparent",
                        padding:0, cursor:"pointer",
                        background:"var(--surface-raised, #F4F4F1)", flexShrink:0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface WorldWearablesHoodieProps {
  onBuyNow: (item: BuyItem) => void;
}

// STANDALONE: just the hoodie, the one priced item, completely
// separate section from the gallery above.
export function WorldWearablesHoodie({ onBuyNow }: WorldWearablesHoodieProps) {
  return (
    <div style={{ padding:"1rem", borderRadius:10, border:`1px solid ${BDR}`,
                   background:"var(--surface, #FFFFFF)", display:"flex", justifyContent:"space-between",
                   alignItems:"center", flexWrap:"wrap", gap:"0.75rem" }}>
      <div>
        <div style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600, color:G, marginBottom:2 }}>
          World Wearables
        </div>
        <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700, color:"#15151A" }}>
          World Labs Hoodie
        </div>
        <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700, color:G }}>
          $65.00
        </div>
      </div>
      <button onClick={() => onBuyNow({
          id: "world-wearables-hoodie",
          name: "World Labs Hoodie",
          price: "$65.00",
          description: "One physical hoodie, shipped to you, with an on-chain record of authenticity and ownership tied to this specific item.",
          color: G,
          requiresShipping: true,
          sizes: ["S", "M", "L", "XL", "XXL"],
        })}
        style={{ padding:"0.6rem 1.5rem", borderRadius:8, border:"none",
                  background:G, color:"#000", fontFamily:S,
                  fontSize:"0.82rem", fontWeight:700, cursor:"pointer" }}>
        Buy the Hoodie →
      </button>
    </div>
  );
}
