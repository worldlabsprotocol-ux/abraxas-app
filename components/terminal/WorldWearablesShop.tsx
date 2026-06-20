"use client";
// FILE: components/terminal/WorldWearablesShop.tsx
// Full shop for the expanded World Wearables collection. I don't know
// which of your new photos shows which specific product, so this sets
// up a few product slots with candidate filenames drawn from your
// numbering pattern. Adjust PRODUCTS below: real name, real price,
// real size list, and the actual filename for each item, the shop UI
// and checkout (size + shipping address + stablecoin payment) all
// work unchanged once you do.

import { useState } from "react";
import { S, G, W, BDR } from "./tokens";
import type { BuyItem } from "./BuyNowModal";

interface WearableProduct {
  id: string;
  name: string;
  price: string;
  sizes: string[];
  imageCandidates: string[];
}

// Adjust this list to match your real products. Filenames below guess
// from your numbering pattern (11, 22, 33 ... 1313), swap in the exact
// ones once you know which photo is which item.
const PRODUCTS: WearableProduct[] = [
  {
    id: "wearables-hoodie",
    name: "World Labs Hoodie",
    price: "$65.00",
    sizes: ["S", "M", "L", "XL", "XXL"],
    imageCandidates: ["/assets/worldwearables/1313.jpg", "/assets/worldwearables/1212.jpg"],
  },
  {
    id: "wearables-tee",
    name: "World Labs Tee",
    price: "$35.00",
    sizes: ["S", "M", "L", "XL"],
    imageCandidates: ["/assets/worldwearables/1111.jpg", "/assets/worldwearables/1010.jpg"],
  },
  {
    id: "wearables-cap",
    name: "World Labs Cap",
    price: "$28.00",
    sizes: ["One Size"],
    imageCandidates: ["/assets/worldwearables/99.jpg", "/assets/worldwearables/88.jpg"],
  },
];

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

interface WorldWearablesShopProps {
  onBuyNow: (item: BuyItem) => void;
}

export function WorldWearablesShop({ onBuyNow }: WorldWearablesShopProps) {
  return (
    <div>
      <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                     color:W, marginBottom:"0.375rem" }}>
        World Wearables
      </div>
      <div style={{ fontFamily:S, fontSize:"0.78rem",
                     color:"rgba(255,255,255,0.45)", marginBottom:"1.25rem" }}>
        Real apparel, one physical item per purchase, with an on-chain
        record proving authenticity and ownership. Pay in stablecoin,
        we ship the actual item.
      </div>
      <div style={{ display:"grid",
                     gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
                     gap:"0.875rem" }}>
        {PRODUCTS.map(p => (
          <div key={p.id} style={{ borderRadius:10, overflow:"hidden",
                                     border:`1px solid ${BDR}`, background:"#0A0C10" }}>
            <div style={{ height:180, position:"relative", background:"#08090F" }}>
              <CascadingImage candidates={p.imageCandidates} alt={p.name} />
            </div>
            <div style={{ padding:"0.875rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                             alignItems:"baseline", marginBottom:"0.625rem" }}>
                <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700, color:W }}>
                  {p.name}
                </span>
                <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700, color:G }}>
                  {p.price}
                </span>
              </div>
              <button onClick={() => onBuyNow({
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  description: `One physical ${p.name}, shipped to you, with an on-chain record of authenticity and ownership tied to this specific item.`,
                  color: G,
                  requiresShipping: true,
                  sizes: p.sizes,
                })}
                style={{ width:"100%", padding:"0.55rem", borderRadius:8,
                          border:"none", background:G, color:"#000",
                          fontFamily:S, fontSize:"0.78rem", fontWeight:700,
                          cursor:"pointer" }}>
                Shop now →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
