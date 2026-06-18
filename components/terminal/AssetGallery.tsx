"use client";
// FILE: components/terminal/AssetGallery.tsx
// Photo gallery for assets where real images exist. Ready to receive
// real files, currently empty for Cielo and DeMarko's catalog since
// those photos are not safe to pull automatically (real Airbnb listing
// photos and real book cover art are both copyrighted, even though
// you own the underlying property and the books, the photo files
// themselves need to come from you directly, drop them in
// /public/assets/cielo/ or /public/assets/demarko/ and list the
// filenames in the `images` array below, then this component just
// works, no other code changes needed).

import { useState } from "react";

interface AssetGalleryProps {
  images: string[]; // paths like "/assets/cielo/01.jpg"
  fallbackLabel: string;
  color: string;
}

export function AssetGallery({ images, fallbackLabel, color }: AssetGalleryProps) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    // Honest empty state, not a broken image icon
    return (
      <div style={{ height:180, display:"flex", alignItems:"center",
                     justifyContent:"center", background:"rgba(255,255,255,0.02)",
                     border:`1px dashed ${color}30`, borderRadius:8 }}>
        <span style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:"0.75rem",
                        color:"rgba(255,255,255,0.3)" }}>
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ height:220, borderRadius:8, overflow:"hidden",
                     position:"relative", background:"#000" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active]} alt={fallbackLabel}
             style={{ width:"100%", height:"100%", objectFit:"cover" }} />
      </div>
      {images.length > 1 && (
        <div style={{ display:"flex", gap:"0.375rem", marginTop:"0.5rem" }}>
          {images.map((img, i) => (
            <button key={img} onClick={() => setActive(i)}
              style={{ width:48, height:36, borderRadius:5, overflow:"hidden",
                        border: i === active ? `2px solid ${color}` : "2px solid transparent",
                        padding:0, cursor:"pointer", background:"#000" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
