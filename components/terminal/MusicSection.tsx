"use client";
// FILE: components/terminal/MusicSection.tsx

import { ArtistAuditForm } from "@/components/music/ArtistAuditForm";
import { M, S, G, W } from "./tokens";
import { Label, ScrollFade } from "./ui";

export function MusicSection() {
  return (
    <div style={{ marginBottom:"1.5rem" }}>
      <ScrollFade>
      <Label>Music Royalty Audit</Label>
      <div style={{ marginBottom:"1rem" }}>
        <div style={{ fontFamily:"Georgia,'Times New Roman',serif",
                       fontSize:"clamp(1.5rem,4vw,2.5rem)", fontWeight:700,
                       color:W, lineHeight:1.15, letterSpacing:"-0.02em",
                       marginBottom:"0.625rem" }}>
          Your catalog is earning money
          <br />
          <span style={{ color:G }}>you have not seen.</span>
        </div>
        <p style={{ fontFamily:S, fontSize:"0.82rem",
                     color:"rgba(255,255,255,0.5)", lineHeight:1.7,
                     maxWidth:560, margin:0 }}>
          Publishing deals routinely route royalties to the wrong party. Missing ISRCs,
          unregistered compositions, and MLC gaps leave years of income unclaimed.
          We work with 80+ publishing clients. Our team finds it. You keep it.
        </p>
      </div>
      <ArtistAuditForm />
      </ScrollFade>
    </div>
  );
}
