"use client";
// FILE: components/terminal/WorldWearablesShop.tsx
// Two fully separate exports now: the photo gallery (no pricing, just
// the collection) and the hoodie (the one priced, buyable item), no
// longer nested together in one component.

import { useState, useEffect } from "react";
import { S, G, BDR } from "./tokens";
import type { BuyItem } from "./BuyNowModal";

const EXCLUDED_FILES = new Set(["1616.jpg"]); // D-9's photo, lives in this folder but shown only in Music

const WEARABLES_IMAGES: string[] = Array.from({ length: 25 }, (_, i) => {
  const n = i + 1;
  return `${n}${n}.jpg`;
}).filter(name => !EXCLUDED_FILES.has(name))
  .map(name => `/assets/worldwearables/${name}`);

function checkImage(src: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

// STANDALONE: just the photo collection, no pricing.
export function WorldWearablesGallery() {
  const [validImages, setValidImages] = useState<string[] | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    Promise.all(WEARABLES_IMAGES.map(async src => (await checkImage(src)) ? src : null))
      .then(results => setValidImages(results.filter((r): r is string => r !== null)));
  }, []);

  const images = validImages ?? [];
  if (images.length === 0) return null;

  return (
    <div>
      <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                     color:"#F8FAFC", marginBottom:"0.375rem" }}>
        World Wearables
      </div>
      <div style={{ fontFamily:S, fontSize:"0.78rem",
                     color:"rgba(255,255,255,0.45)", marginBottom:"1.25rem" }}>
        The collection so far.
      </div>
      <div style={{ width:"100%", minHeight:280, maxHeight:480,
                     borderRadius:10, overflow:"hidden", background:"#000",
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
                        padding:0, cursor:"pointer", background:"#000", flexShrink:0 }}>
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
                   background:"#0A0C10", display:"flex", justifyContent:"space-between",
                   alignItems:"center", flexWrap:"wrap", gap:"0.75rem" }}>
      <div>
        <div style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600, color:G, marginBottom:2 }}>
          World Wearables
        </div>
        <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700, color:"#F8FAFC" }}>
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
