"use client";
// FILE: components/home/cinematic/thesis/NarrativeSectionBridge.tsx
// Visual handoff between homepage thesis sections — not another fade-up block.

import { motion, useReducedMotion } from "framer-motion";
import { ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";
import { abxMotionTransition } from "@/lib/motion/abxMotionFramer";

export function NarrativeSectionBridge({
  label,
  direction = "down",
}: {
  label: string;
  direction?: "down" | "forward";
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`abx-narrative-bridge abx-narrative-bridge--${direction}`}
      aria-hidden="true"
    >
      <motion.span
        className="abx-narrative-bridge__line"
        initial={reduce ? false : { scaleY: 0, opacity: 0 }}
        whileInView={{ scaleY: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={abxMotionTransition("protocol", { tier: "cinematic" })}
      />
      <motion.span
        className="abx-narrative-bridge__label"
        style={{ fontFamily: ABX_FONT_MONO }}
        initial={reduce ? false : { opacity: 0, y: direction === "forward" ? 8 : 4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={abxMotionTransition("verify", { tier: "cinematic", delay: 0.08 })}
      >
        {label}
      </motion.span>
    </div>
  );
}
