"use client";
// FILE: components/home/HomeDemoVideo.tsx
// Homepage demo — cinematic product story (keynote motion).

import { HomeCinematicDemo } from "./HomeCinematicDemo";

export function HomeDemoVideo() {
  return (
    <div
      id="demo"
      style={{
        margin: "clamp(1.25rem, 3vw, 1.75rem) 0 clamp(1.5rem, 3.5vw, 2rem)",
        width: "100%",
      }}
    >
      <HomeCinematicDemo />
    </div>
  );
}
