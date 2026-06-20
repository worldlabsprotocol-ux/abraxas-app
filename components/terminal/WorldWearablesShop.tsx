"use client";
// FILE: components/terminal/WorldWearablesShop.tsx
// Full photo gallery of the collection, one priced item (the hoodie,
// $65), no prices on anything else until ready.

import { useState, useEffect } from "react";
import { S, G, W, BDR } from "./tokens";
import type { BuyItem } from "./BuyNowModal";

// All numbered files in the pattern you described: 11,22,33...1313.
const WEARABLES_IMAGES: string[] = Array.from({ length: 12 }, (_, i) => {
  const n = (i + 1) * 11;
  return `/assets/worldwearables/${n}.jpg`;
});

function checkImage(src: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

interface WorldWearablesShopProps {
  onBuyNow: (item: BuyItem) => void;
}

export function WorldWearablesShop({ onBuyNow }: WorldWearablesShopProps) {
  const [validImages, setValidImages] = useState<string[] | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    Promise.all(WEARABLES_IMAGES.map(async src => (await checkImage(src)) ? src : null))
      .then(results => setValidImages(results.filter((r): r is string => r !== null)));
  }, []);

  const images = validImages ?? [];

  return (
    <div>
      <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                     color:W, marginBottom:"0.375rem" }}>
        World Wearables
      </div>
      <div style={{ fontFamily:S, fontSize:"0.78rem",
                     color:"rgba(255,255,255,0.45)", marginBottom:"1.25rem" }}>
        Real apparel, with an on-chain record proving authenticity and
        ownership. The hoodie ships today, the rest of this collection
        is coming.
      </div>

      {images.length > 0 && (
        <div style={{ marginBottom:"1.25rem" }}>
          <div style={{ width:"100%", minHeight:280, maxHeight:480,
                         borderRadius:10, overflow:"hidden", background:"#000",
                         display:"flex", alignItems:"center", justifyContent:"center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[active]} alt="World Wearables"
                 style={{ width:"100%", height:"100%", maxHeight:480, objectFit:"contain" }} />
          </div>
          {images.length > 1 && (
            <div style={{ display:"flex", gap:"0.375rem", marginTop:"0.5rem",
                           overflowX:"auto" }}>
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
      )}

      <div style={{ padding:"1rem", borderRadius:10, border:`1px solid ${BDR}`,
                     background:"#0A0C10", display:"flex", justifyContent:"space-between",
                     alignItems:"center", flexWrap:"wrap", gap:"0.75rem" }}>
        <div>
          <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700, color:W }}>
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
    </div>
  );
}
