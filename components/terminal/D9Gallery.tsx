"use client";
// FILE: components/terminal/D9Gallery.tsx
// Wide net across every plausible filename in /public/assets/d0/,
// shows everything that actually loads as a real gallery instead of
// guessing 4 exact files and going blank if any are wrong.

import { useState, useEffect } from "react";
import { S, G, W } from "./tokens";

function buildCandidates(): string[] {
  const out: string[] = [];
  // Repeated-digit pattern matching what you described for wearables
  for (let n = 11; n <= 2020; n += 11) {
    if (String(n).length >= 2 && new Set(String(n)).size <= 2) {
      out.push(`/assets/d0/${n}.jpg`);
    }
  }
  // Sequential plain numbers too, in case that's the actual pattern
  for (let n = 1; n <= 20; n++) {
    out.push(`/assets/d0/${n}.jpg`);
    out.push(`/assets/d0/${String(n).padStart(2, "0")}.jpg`);
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

export function D9Gallery() {
  const [images, setImages] = useState<string[] | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    Promise.all(CANDIDATES.map(checkImage)).then(results => {
      setImages(results.filter((r): r is string => r !== null));
    });
  }, []);

  if (images === null) {
    return <div style={{ width:64, height:64, borderRadius:8, background:"#08090F", flexShrink:0 }} />;
  }

  if (images.length === 0) {
    return (
      <div style={{ width:64, height:64, borderRadius:8, background:"#08090F",
                     display:"flex", alignItems:"center", justifyContent:"center",
                     flexShrink:0 }}>
        <span style={{ fontFamily:S, fontSize:"0.55rem", color:"rgba(255,255,255,0.3)" }}>
          D9
        </span>
      </div>
    );
  }

  return (
    <div style={{ width:64, height:64, borderRadius:8, overflow:"hidden",
                   position:"relative", background:"#08090F", flexShrink:0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[active % images.length]} alt="D-9 Musick"
           style={{ width:"100%", height:"100%", objectFit:"cover" }} />
    </div>
  );
}
