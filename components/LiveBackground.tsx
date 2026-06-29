"use client";
// FILE: components/LiveBackground.tsx
// Full-page ambient layer: soft green light streaks + a margin dot
// network. Nodes drift at varied speeds/sizes (not a uniform grid), and
// the whole layer parallaxes slightly slower than page content for
// depth. All motion respects prefers-reduced-motion.

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

// Deterministic per-node variation so SSR and client render identically
// (no Math.random hydration mismatch).
const NODES = Array.from({ length: 16 }).map((_, i) => {
  const seed = (i * 9301 + 49297) % 233280;
  const r = seed / 233280;
  return {
    left: i % 2 === 0 ? `${2 + (i * 3.3) % 9}%` : undefined,
    right: i % 2 === 1 ? `${2 + (i * 2.7) % 9}%` : undefined,
    top: `${6 + (i * 13.7) % 88}%`,
    size: 3 + Math.round(r * 5),          // 3–8px
    duration: 7 + Math.round(r * 11),     // 7–18s
    delay: -Math.round(r * 12),           // desync start
    drift: 10 + Math.round(r * 18),       // 10–28px travel
    opacity: 0.14 + r * 0.16,             // 0.14–0.30
  };
});

export function LiveBackground() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // Background moves slower than content (subtle parallax).
  const y = useTransform(scrollY, [0, 1600], [0, -70]);

  return (
    <motion.div
      aria-hidden="true"
      className="abr-live-bg"
      style={{
        position: "fixed",
        top: "-8%",
        left: 0,
        right: 0,
        height: "116%",
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
        y: reduce ? 0 : y,
      }}
    >
      <div style={{
        position: "absolute", top: "18%", left: "-15%", width: "130%", height: 180,
        background: "var(--hero-glow)", transform: "rotate(-12deg)", filter: "blur(60px)", opacity: 0.9,
      }} />
      <div style={{
        position: "absolute", bottom: "22%", right: "-20%", width: "80%", height: 120,
        background: "rgba(16,185,129,0.08)", transform: "rotate(8deg)", filter: "blur(50px)",
      }} />

      {NODES.map((n, i) => (
        <div key={i} className="abr-live-dot" style={{
          position: "absolute",
          left: n.left,
          right: n.right,
          top: n.top,
          width: n.size,
          height: n.size,
          borderRadius: "50%",
          background: "#10B981",
          opacity: n.opacity,
          boxShadow: "0 0 12px rgba(16,185,129,0.5)",
          // per-node drift; disabled under reduced motion via the media query below
          animation: `abxDrift ${n.duration}s ease-in-out ${n.delay}s infinite`,
          // expose the travel distance to the keyframe
          ["--drift" as string]: `${n.drift}px`,
        }} />
      ))}

      <style>{`
        @keyframes abxDrift {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50%      { transform: translate3d(0, calc(var(--drift) * -1), 0); }
        }
        [data-theme="dark"] .abr-live-dot { opacity: 0.4; }
        @media (max-width: 720px) { .abr-live-bg { opacity: 0.65; } }
        @media (prefers-reduced-motion: reduce) {
          .abr-live-dot { animation: none !important; }
        }
      `}</style>
    </motion.div>
  );
}
