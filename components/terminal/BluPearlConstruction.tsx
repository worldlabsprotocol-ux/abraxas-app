"use client";
// FILE: components/terminal/BluPearlConstruction.tsx
// Construction progress gallery for The Clove, monthly collages dating
// back to construction start in 2023. Casts a wide net across every
// plausible month-year filename and shows whatever actually loads.
// Uses the shared, cached discoverImages utility instead of its own
// copy of the same probing logic, and shows a real loading skeleton
// instead of blank space while it works.
//
// LIGHT-MODE FIX (June 2026): swapped the pure-#000 image letterbox
// for var(--surface-raised), matching the AssetGallery fix, keeps
// every photo component on the site using the same light neutral
// instead of a leftover black box from the dark theme.

import { useState, useEffect } from "react";
import { S, A, BDR } from "./tokens";
import { discoverImages, monthYearFilenames } from "@/lib/discoverImages";

const CANDIDATES = monthYearFilenames("/assets/worldwearables", 23, 26);

export function BluPearlConstruction() {
  const [images, setImages] = useState<string[] | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    discoverImages("blu-pearl-construction", CANDIDATES).then(setImages);
  }, []);

  // Loading: a real skeleton, not blank space indistinguishable from "nothing found"
  if (images === null) {
    return (
      <div style={{ marginTop:"0.875rem" }}>
        <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:600,
                       color:A, marginBottom:"0.5rem" }}>
          Construction journey, 2023 to present
        </div>
        <div style={{ width:"100%", height:200, borderRadius:8,
                       background:"#F4F4F1", border:`1px solid ${BDR}`,
                       display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontFamily:S, fontSize:"0.7rem", color:"rgba(21,21,26,0.4)" }}>
            Loading photos…
          </span>
        </div>
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <div style={{ marginTop:"0.875rem" }}>
      <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:600,
                     color:A, marginBottom:"0.5rem" }}>
        Construction journey, 2023 to present
      </div>
      <div style={{ width:"100%", minHeight:200, maxHeight:360,
                     borderRadius:8, overflow:"hidden", background:"var(--surface-raised, #F4F4F1)",
                     display:"flex", alignItems:"center", justifyContent:"center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active]} alt="Construction progress"
             style={{ width:"100%", height:"100%", maxHeight:360, objectFit:"contain" }} />
      </div>
      {images.length > 1 && (
        <div style={{ display:"flex", gap:"0.3rem", marginTop:"0.5rem", overflowX:"auto" }}>
          {images.map((img, i) => (
            <button key={img} onClick={() => setActive(i)}
              style={{ width:44, height:32, borderRadius:4, overflow:"hidden",
                        border: i === active ? `2px solid ${A}` : "2px solid transparent",
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
