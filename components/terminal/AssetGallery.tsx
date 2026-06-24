"use client";
// FILE: components/terminal/AssetGallery.tsx
// Photo gallery for assets where real images exist. Automatically
// detects which filenames in the `images` array actually load, and
// only shows those, so a guessed filename range that's slightly off
// doesn't produce broken-image icons, it just quietly shows whatever
// actually exists. Drop new files in /public/assets/{folder}/ and list
// filenames in the array, this works either way.

import { useState, useEffect } from "react";

interface AssetGalleryProps {
  images: string[]; // paths like "/assets/cielo/01.jpg"
  fallbackLabel: string;
  color: string;
}

export function AssetGallery({ images, fallbackLabel, color }: AssetGalleryProps) {
  const [active, setActive] = useState(0);
  const [validImages, setValidImages] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      images.map(
        src =>
          new Promise<string | null>(resolve => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => resolve(null);
            img.src = src;
          })
      )
    ).then(results => {
      if (!cancelled) setValidImages(results.filter((r): r is string => r !== null));
    });
    return () => { cancelled = true; };
  }, [images]);

  // Still checking which files actually exist
  if (validImages === null) {
    return (
      <div style={{ height:180, display:"flex", alignItems:"center",
                     justifyContent:"center", background:"rgba(255,255,255,0.02)",
                     borderRadius:8 }}>
        <span style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:"0.72rem",
                        color:"rgba(21,21,26,0.25)" }}>
          Loading...
        </span>
      </div>
    );
  }

  if (validImages.length === 0) {
    // Honest empty state, not a broken image icon
    return (
      <div style={{ height:180, display:"flex", alignItems:"center",
                     justifyContent:"center", background:"rgba(255,255,255,0.02)",
                     border:`1px dashed ${color}30`, borderRadius:8 }}>
        <span style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:"0.75rem",
                        color:"rgba(21,21,26,0.3)" }}>
          {fallbackLabel}
        </span>
      </div>
    );
  }

  const safeActive = Math.min(active, validImages.length - 1);

  return (
    <div>
      <div style={{ width:"100%", minHeight:320, maxHeight:520,
                     borderRadius:8, overflow:"hidden", position:"relative",
                     background:"#000", display:"flex",
                     alignItems:"center", justifyContent:"center" }}>
        {/* objectFit:contain guarantees the full image is always visible,
            never cropped, important for collage-style images covering
            multiple rooms in one frame */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={validImages[safeActive]} alt={fallbackLabel}
             style={{ width:"100%", height:"100%", maxHeight:520,
                      objectFit:"contain" }} />
      </div>
      {validImages.length > 1 && (
        <div style={{ display:"flex", gap:"0.375rem", marginTop:"0.5rem",
                       overflowX:"auto", paddingBottom:"0.25rem" }}>
          {validImages.map((img, i) => (
            <button key={img} onClick={() => setActive(i)}
              style={{ width:56, height:42, borderRadius:5, overflow:"hidden",
                        border: i === safeActive ? `2px solid ${color}` : "2px solid transparent",
                        padding:0, cursor:"pointer", background:"#000",
                        flexShrink:0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
