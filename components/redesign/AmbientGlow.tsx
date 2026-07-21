"use client";
// FILE: components/redesign/AmbientGlow.tsx
// Gold + violet ambient glow — institutional shell continuity from boot screen.

import { motion, useReducedMotion } from "framer-motion";

export function AmbientGlow() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" style={{
      position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none",
    }}>
      <motion.div
        initial={false}
        animate={reduce ? undefined : { opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: "-18%", left: "50%", transform: "translateX(-50%)",
          width: "min(1100px, 120%)", height: 620,
          background: "radial-gradient(50% 50% at 50% 50%, rgba(232,197,71,0.16) 0%, rgba(232,197,71,0.06) 42%, rgba(4,5,10,0) 72%)",
          filter: "blur(24px)",
        }}
      />
      <motion.div
        initial={false}
        animate={reduce ? undefined : { opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        style={{
          position: "absolute", bottom: "2%", left: "-10%",
          width: 640, height: 460,
          background: "radial-gradient(50% 50% at 50% 50%, rgba(167,139,250,0.14) 0%, rgba(167,139,250,0.05) 45%, rgba(4,5,10,0) 72%)",
          filter: "blur(32px)",
        }}
      />
      <motion.div
        initial={false}
        animate={reduce ? undefined : { opacity: [0.4, 0.62, 0.4] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        style={{
          position: "absolute", top: "8%", right: "-12%",
          width: 540, height: 440,
          background: "radial-gradient(50% 50% at 50% 50%, rgba(167,139,250,0.12) 0%, rgba(139,92,246,0.04) 45%, rgba(4,5,10,0) 72%)",
          filter: "blur(34px)",
        }}
      />
      <motion.div
        initial={false}
        animate={reduce ? undefined : { opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{
          position: "absolute", top: "35%", left: "20%",
          width: 480, height: 380,
          background: "radial-gradient(50% 50% at 50% 50%, rgba(34,211,238,0.1) 0%, rgba(34,211,238,0.03) 45%, rgba(4,5,10,0) 72%)",
          filter: "blur(36px)",
        }}
      />
    </div>
  );
}
