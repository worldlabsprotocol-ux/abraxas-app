"use client";
// FILE: lib/motion/cinematic/useScrollSectionProgress.ts
// Lightweight scroll progress via IntersectionObserver — no per-frame React rerenders.

import { useEffect, useRef, useState } from "react";

export function useScrollSectionProgress(thresholds = 5): {
  ref: React.RefObject<HTMLElement | null>;
  progress: number;
} {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const ratio = entry.intersectionRatio;
        const top = entry.boundingClientRect.top;
        const vh = window.innerHeight || 1;
        const scrollThrough = Math.min(1, Math.max(0, 1 - top / vh));
        const blended = Math.min(1, Math.max(ratio, scrollThrough * 0.85));
        const stepped = Math.round(blended * thresholds) / thresholds;
        setProgress(stepped);
      },
      { threshold: Array.from({ length: thresholds + 1 }, (_, i) => i / thresholds) },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [thresholds]);

  return { ref, progress };
}
