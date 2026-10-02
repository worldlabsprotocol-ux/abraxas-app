"use client";
// FILE: lib/motion/cinematic/useStickyScrollProgress.ts
// Scroll progress through a tall sticky section (0 → 1). Passive listener, IO-gated, rAF-batched.

import { useEffect, useRef, useState } from "react";

const PROGRESS_STEP = 0.012;

function quantizeProgress(value: number): number {
  return Math.round(value / PROGRESS_STEP) * PROGRESS_STEP;
}

export function useStickyScrollProgress(_minHeightVh = 180): {
  ref: React.RefObject<HTMLElement | null>;
  progress: number;
} {
  const ref = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const activeRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const computeProgress = (): number => {
      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const scrollable = Math.max(node.offsetHeight - viewport, 1);
      const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
      return quantizeProgress(scrolled / scrollable);
    };

    const commitProgress = (next: number) => {
      if (Math.abs(next - progressRef.current) < PROGRESS_STEP * 0.5) return;
      progressRef.current = next;
      setProgress(next);
    };

    const update = () => {
      rafRef.current = null;
      if (!activeRef.current) return;
      commitProgress(computeProgress());
    };

    const scheduleUpdate = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        activeRef.current = entries.some((entry) => entry.isIntersecting);
        if (activeRef.current) {
          scheduleUpdate();
        } else {
          if (rafRef.current !== null) {
            window.cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        }
      },
      { root: null, rootMargin: "120px 0px", threshold: 0 },
    );

    observer.observe(node);
    commitProgress(computeProgress());

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { ref, progress };
}
