"use client";
// FILE: components/redesign/AmbientGlow.tsx
// Signature green ambient glow for the dark premium theme. Soft radial
// light bleeding behind content (not a flat gradient fill on any card or
// button). Fixed layer, very subtle drift, reduced-motion safe.

import { motion, useReducedMotion } from "framer-motion";

export function AmbientGlow() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" style={{
      position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none",
    }}>
      {/* top hero glow */}
      <motion.div
        initial={false}
        animate={reduce ? undefined : { opacity: [0.55, 0.8, 0.55] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: "-22%", left: "50%", transform: "translateX(-50%)",
          width: "min(1100px, 120%)", height: 620,
          background: "radial-gradient(50% 50% at 50% 50%, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.07) 42%, rgba(6,9,11,0) 72%)",
          filter: "blur(20px)",
        }}
      />
      {/* lower-left ember */}
      <motion.div
        initial={false}
        animate={reduce ? undefined : { opacity: [0.4, 0.62, 0.4] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        style={{
          position: "absolute", bottom: "4%", left: "-12%",
          width: 640, height: 460,
          background: "radial-gradient(50% 50% at 50% 50%, rgba(0,255,136,0.12) 0%, rgba(16,185,129,0.05) 45%, rgba(6,9,11,0) 72%)",
          filter: "blur(30px)",
        }}
      />
      {/* faint top-right violet balance. secondary accent */}
      <motion.div
        initial={false}
        animate={reduce ? undefined : { opacity: [0.5, 0.72, 0.5] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        style={{
          position: "absolute", top: "6%", right: "-14%",
          width: 540, height: 440,
          background: "radial-gradient(50% 50% at 50% 50%, rgba(139,92,246,0.14) 0%, rgba(139,92,246,0.05) 45%, rgba(6,9,11,0) 72%)",
          filter: "blur(34px)",
        }} />
    </div>
  );
}
