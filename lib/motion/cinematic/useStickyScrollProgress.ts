"use client";
// FILE: lib/motion/cinematic/useStickyScrollProgress.ts
// Scroll progress through a tall sticky section (0 → 1). Passive listener, no rAF loop.

import { useEffect, useRef, useState } from "react";

export function useStickyScrollProgress(minHeightVh = 180): {
  ref: React.RefObject<HTMLElement | null>;
  progress: number;
} {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const scrollable = Math.max(node.offsetHeight - viewport, 1);
      const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
      setProgress(scrolled / scrollable);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [minHeightVh]);

  return { ref, progress };
}
