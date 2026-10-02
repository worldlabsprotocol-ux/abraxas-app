"use client";
// FILE: lib/motion/cinematic/useCinematicNarrativeProgress.ts
// Sticky scroll progress with reduced-motion and mobile static fallbacks.

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useStickyScrollProgress } from "./useStickyScrollProgress";

const MOBILE_QUERY = "(max-width: 720px)";

export function useCinematicNarrativeProgress(minHeightVh = 180): {
  ref: React.RefObject<HTMLElement | null>;
  progress: number;
  isStatic: boolean;
} {
  const reduce = useReducedMotion();
  const { ref, progress } = useStickyScrollProgress(minHeightVh);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const isStatic = Boolean(reduce || isMobile);
  return { ref, progress: isStatic ? 1 : progress, isStatic };
}
