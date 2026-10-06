"use client";
// FILE: lib/motion/cinematic/KineticMarquee.tsx
// Slow editorial kinetic band — not a crypto ticker.

import { useReducedMotion } from "framer-motion";
import { ABX_MOTION } from "@/lib/design/abraxasMotion";
import { ABX_FONT_DISPLAY } from "@/lib/design/abraxasDesignSystem";

export function KineticMarquee({
  text,
  separator = " • ",
  className,
}: {
  text: string;
  separator?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const phrase = `${text}${separator}`.repeat(4);

  if (reduce) {
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{
          fontFamily: ABX_FONT_DISPLAY,
          fontSize: "clamp(0.72rem, 2vw, 0.88rem)",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(232, 197, 71, 0.55)",
          textAlign: "center",
          padding: "0.85rem 0",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {text}
      </div>
    );
  }

  return (
    <div
      className={`abx-kinetic-marquee ${className ?? ""}`}
      aria-hidden="true"
      style={{
        overflow: "hidden",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
      }}
    >
      <div
        className="abx-kinetic-marquee__track"
        style={{
          display: "flex",
          width: "max-content",
          animation: `abx-marquee-scroll ${ABX_MOTION.editorial.durationMs}ms linear infinite`,
        }}
      >
        <span
          style={{
            fontFamily: ABX_FONT_DISPLAY,
            fontSize: "clamp(0.72rem, 2vw, 0.88rem)",
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(232, 197, 71, 0.55)",
            padding: "0.85rem 0",
            whiteSpace: "nowrap",
          }}
        >
          {phrase}
        </span>
        <span
          aria-hidden
          style={{
            fontFamily: ABX_FONT_DISPLAY,
            fontSize: "clamp(0.72rem, 2vw, 0.88rem)",
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(232, 197, 71, 0.55)",
            padding: "0.85rem 0",
            whiteSpace: "nowrap",
          }}
        >
          {phrase}
        </span>
      </div>
    </div>
  );
}
