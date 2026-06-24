"use client";
// FILE: components/terminal/D9Gallery.tsx
// D-9 Musick's photo actually lives at /public/assets/worldwearables/
// 1616.jpg now (moved there since the separate d0 folder never
// rendered). This shows that one file, and explicitly does not appear
// in the World Wearables shop gallery, that's handled by excluding
// this exact filename there.

import { S } from "./tokens";

const D9_IMAGE = "/assets/worldwearables/1616.jpg";

export function D9Gallery() {
  return (
    <div style={{ width:64, height:64, borderRadius:8, overflow:"hidden",
                   position:"relative", background:"#F4F4F1", flexShrink:0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={D9_IMAGE} alt="D-9 Musick"
           style={{ width:"100%", height:"100%", objectFit:"cover" }} />
    </div>
  );
}
