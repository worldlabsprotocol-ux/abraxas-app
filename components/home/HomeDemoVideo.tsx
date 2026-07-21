"use client";
// FILE: components/home/HomeDemoVideo.tsx
// Homepage hero demo — full-width, centered breakout.

import { HomeCinematicDemo } from "./HomeCinematicDemo";

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
        <HomeCinematicDemo hero />
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
