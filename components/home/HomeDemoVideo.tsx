"use client";
// FILE: components/home/HomeDemoVideo.tsx
// Homepage hero — elite verify loop slideshow.

import { EliteConceptDemo } from "./ConceptDemoVideo";
import { HERO_ELITE_DEMO } from "@/lib/eliteDemoSlides";

export function HomeDemoVideo() {
  return (
    <div
      id="demo"
      className="hero-demo-breakout"
      style={{
        margin: "clamp(1.5rem, 4vw, 2.25rem) 0 clamp(1.75rem, 4vw, 2.5rem)",
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1120 }}>
        <EliteConceptDemo config={HERO_ELITE_DEMO} id="hero-elite-demo" />
      </div>
      <style jsx>{`
        @media (min-width: 900px) {
          .hero-demo-breakout {
            width: min(1120px, calc(100% + 4rem));
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>
    </div>
  );
}
