"use client";
// FILE: components/terminal/DemoVideoSection.tsx
// "See it in action" restored from the original loading page.
// Video itself is coming soon, honestly labeled, not a fake embed.

import { S, G, W, BDR } from "./tokens";
import { ScrollFade } from "./ui";

export function DemoVideoSection() {
  return (
    <ScrollFade>
      <div>
        <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                       color:G, marginBottom:"0.5rem" }}>
          See it in action
        </div>
        <div style={{ fontFamily:S, fontSize:"clamp(1rem,2.2vw,1.25rem)",
                       fontWeight:700, color:W, marginBottom:"1rem" }}>
          From submission to verified asset in under 5 minutes.
        </div>
        <div style={{ aspectRatio:"16/9", borderRadius:12, overflow:"hidden",
                       background:"#FFFFFF",
                       border:`1px solid ${BDR}`, display:"flex",
                       flexDirection:"column", alignItems:"center",
                       justifyContent:"center", gap:"0.75rem" }}>
          <div style={{ width:56, height:56, borderRadius:"50%",
                         border:`2px solid ${G}50`, display:"flex",
                         alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:0, height:0,
                           borderTop:"10px solid transparent",
                           borderBottom:"10px solid transparent",
                           borderLeft:`16px solid ${G}`, marginLeft:4 }} />
          </div>
          <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:600,
                         color:"rgba(255,255,255,0.4)", letterSpacing:"0.05em" }}>
            DEMO VIDEO, COMING SOON
          </div>
          <div style={{ fontFamily:S, fontSize:"0.7rem", color:G }}>
            Subscribe to the Abraxas YouTube channel for updates
          </div>
        </div>
        <div style={{ fontFamily:S, fontSize:"0.62rem",
                       color:"rgba(255,255,255,0.25)", marginTop:"0.5rem",
                       textAlign:"center" }}>
          ABRAXAS, PROTOCOL DEMO
        </div>
      </div>
    </ScrollFade>
  );
}
