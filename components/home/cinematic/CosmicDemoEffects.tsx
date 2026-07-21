"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";

/** Subtle floating particles for premium demo backgrounds. */
export function CosmicParticleField({
  accent = "#A78BFA",
  count = 18,
  style,
}: {
  accent?: string;
  count?: number;
  style?: CSSProperties;
}) {
  const seeds = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 17 + 11) % 100}%`,
    top: `${(i * 23 + 7) % 100}%`,
    size: 2 + (i % 3),
    delay: (i % 5) * 0.4,
    duration: 4 + (i % 4),
  }));

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={style}
      aria-hidden
    >
      {seeds.map(p => (
        <motion.span
          key={p.id}
          initial={{ opacity: 0.15, y: 0 }}
          animate={{
            opacity: [0.12, 0.55, 0.12],
            y: [0, -12 - (p.id % 4) * 4, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: accent,
            boxShadow: `0 0 ${p.size * 3}px ${accent}`,
          }}
        />
      ))}
    </div>
  );
}

/** Ambient corner glow for cards and credential reveals. */
export function CosmicCornerGlow({ color = "#E8C547" }: { color?: string }) {
  return (
    <>
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full opacity-40 blur-3xl"
        style={{ background: color }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 h-36 w-36 rounded-full opacity-25 blur-3xl"
        style={{ background: "#A78BFA" }}
        aria-hidden
      />
    </>
  );
}
