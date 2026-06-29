"use client";
// FILE: components/terminal/CoffeeFarmSection.tsx
// Bought outright in 2020 for $15K, producing and selling locally
// today. Explicitly marked pending, since real region, acreage,
// yield/revenue, buyer relationships, and photos aren't confirmed yet.
// Nothing here is fabricated to fill the gap, that's the whole point
// of showing it this way instead of guessing at numbers.

import { S, A, W, BDR } from "./tokens";
import { ScrollFade } from "./ui";

export function CoffeeFarmSection() {
  return (
    <ScrollFade>
      <div style={{ borderRadius:10, border:`1px dashed ${BDR}`,
                     padding:"1.125rem 1.25rem", opacity:0.85 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                       marginBottom:"0.5rem", flexWrap:"wrap" }}>
          <span style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600, color:A }}>
            Coming to the registry
          </span>
          <span style={{ fontFamily:S, fontSize:"0.6rem", fontWeight:700,
                          color:A, background:`${A}15`, padding:"0.1rem 0.5rem",
                          borderRadius:10 }}>
            DETAILS PENDING
          </span>
        </div>
        <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700,
                       color:W, marginBottom:"0.5rem" }}>
          Coffee Farm, Central Mexico
        </div>
        <p style={{ fontFamily:S, fontSize:"0.76rem",
                     color:"rgba(242,246,243,0.45)", lineHeight:1.65,
                     margin:0, maxWidth:480 }}>
          Purchased outright in 2020 for $15,000, currently producing and
          selling coffee locally. Being positioned for investors interested
          in scaling to global distribution, real region, acreage, yield,
          and photos still need to be added before this becomes a full listing.
        </p>
      </div>
    </ScrollFade>
  );
}
