"use client";
// FILE: components/registry/CmnRegistrySlideshow.tsx
// Mini auto-advance slideshow for PSA Pokémon registry cards.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cmnDesignsSlideshowPaths } from "@/lib/cmnDesignsMedia";
import { probeImageList } from "@/lib/mediaProbe";

const INTERVAL_MS = 3800;

export function CmnRegistrySlideshow({
  alt,
  height = 220,
  objectPosition = "center center",
  showDots = true,
}: {
  alt: string;
  height?: number;
  objectPosition?: string;
  showDots?: boolean;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    void probeImageList(cmnDesignsSlideshowPaths()).then(found => {
      if (!cancelled) setImages(found);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (reduce || images.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setIndex(i => (i + 1) % images.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [images.length, reduce]);

  const src = images[index] ?? images[0];

  if (!images.length) {
    return (
      <div style={{
        height, background: "#06090B",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "0.72rem", color: "var(--text-muted)",
      }}>
        Loading slabs…
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height, background: "#06090B", overflow: "hidden" }}>
      {reduce ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition, display: "block" }}
        />
      ) : (
        <AnimatePresence mode="sync">
          <motion.img
            key={src}
            src={src}
            alt={alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%", objectFit: "cover", objectPosition, display: "block",
            }}
          />
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
