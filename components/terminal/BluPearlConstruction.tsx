"use client";
// FILE: components/terminal/BluPearlConstruction.tsx
// Construction progress gallery for The Clove, monthly collages dating
// back to construction start in 2023. Only a few exact filenames were
// confirmed (dec23, jan24, feb26), so this casts a wide net across
// every plausible month-year combination and shows whatever actually
// loads, same self-healing pattern used elsewhere on the site.

import { useState, useEffect } from "react";
import { S, A } from "./tokens";

const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

function buildCandidates(): string[] {
  const out: string[] = [];
  for (let year = 23; year <= 26; year++) {
    for (const m of MONTHS) {
      out.push(`/assets/worldwearables/${m}${year}.jpg`);
      out.push(`/assets/worldwearables/${m}${year}.webp`);
      out.push(`/assets/worldwearables/${m}${year}.png`);
    }
  }
  return out;
}

const CANDIDATES = buildCandidates();

function checkImage(src: string): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function BluPearlConstruction() {
  const [images, setImages] = useState<string[] | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    Promise.all(CANDIDATES.map(checkImage)).then(results => {
      setImages(results.filter((r): r is string => r !== null));
    });
  }, []);

  if (images === null || images.length === 0) return null;

  return (
    <div style={{ marginTop:"0.875rem" }}>
      <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:600,
                     color:A, marginBottom:"0.5rem" }}>
        Construction journey, 2023 to present
      </div>
      <div style={{ width:"100%", minHeight:200, maxHeight:360,
                     borderRadius:8, overflow:"hidden", background:"#000",
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
