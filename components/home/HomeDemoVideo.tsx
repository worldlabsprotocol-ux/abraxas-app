"use client";
// FILE: components/home/HomeDemoVideo.tsx
// Homepage protocol demo — interactive product loop (replaces static MP4).

import { ProductLoopDemo } from "@/components/redesign/ProductLoopDemo";

export function HomeDemoVideo() {
  return (
    <div
      style={{
        padding: "clamp(0.5rem, 2vw, 1rem) 0 clamp(1.25rem, 3vw, 2rem)",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <ProductLoopDemo home />
    </div>
  );
}
