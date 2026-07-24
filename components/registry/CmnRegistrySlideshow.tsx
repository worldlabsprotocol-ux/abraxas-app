"use client";
// FILE: components/registry/CmnRegistrySlideshow.tsx
// Mini auto-advance slideshow for PSA Pokémon registry cards.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cmnDesignsSlideshowPaths } from "@/lib/cmnDesignsMedia";
import { CMN_DESIGNS_HERO_SRC } from "@/lib/cmnDesignsDisplay";
import { CmnSlabPhoto } from "@/components/registry/CmnSlabPhoto";

const INTERVAL_MS = 4200;
const PATHS = cmnDesignsSlideshowPaths();

export function CmnRegistrySlideshow({
  alt,
  height = 220,
  showDots = true,
}: {
  alt: string;
  height?: number;
  objectPosition?: string;
  showDots?: boolean;
}) {
  const [images] = useState(PATHS);
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || images.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setIndex(i => (i + 1) % images.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [images.length, reduce]);

  const src = images[index] ?? CMN_DESIGNS_HERO_SRC;

  return (
    <div style={{ position: "relative", height, background: "#06090B", overflow: "hidden" }}>
      {reduce ? (
        <CmnSlabPhoto src={src} alt={alt} fill />
      ) : (
        <AnimatePresence mode="sync">
          <motion.div
            key={src}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0 }}
          >
            <CmnSlabPhoto src={src} alt={alt} fill />
          </motion.div>
        </AnimatePresence>
      )}

      {showDots && images.length > 1 && (
        <div style={{
          position: "absolute", bottom: 10, right: 10, display: "flex", gap: 4, zIndex: 2,
        }}>
          {images.slice(0, 8).map((_, i) => (
            <span
              key={i}
              style={{
                width: i === index % 8 ? 14 : 5, height: 5, borderRadius: 999,
                background: i === index % 8 ? "var(--accent, #E8C547)" : "rgba(255,255,255,0.35)",
                transition: "width 0.25s ease",
              }}
            />
          ))}
          {images.length > 8 && (
            <span style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: "0.48rem", fontWeight: 700,
              color: "rgba(255,255,255,0.65)", alignSelf: "center", marginLeft: 2,
            }}>
              +{images.length - 8}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
