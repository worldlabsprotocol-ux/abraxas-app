"use client";
// FILE: lib/motion/cinematic/SplitHeadline.tsx
// Editorial split headline reveal.

import { motion, useReducedMotion } from "framer-motion";
import { ABX_FONT_DISPLAY } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";

export function SplitHeadline({
  lines,
  id,
  align = "center",
}: {
  lines: string[];
  id?: string;
  align?: "center" | "left";
}) {
  const reduce = useReducedMotion();
  const duration = reduce ? 0 : abxMotionDuration("reveal") / 1000;

  return (
    <h1
      id={id}
      style={{
        fontFamily: ABX_FONT_DISPLAY,
        fontSize: "clamp(2.25rem, 7vw, 4.25rem)",
        fontWeight: 900,
        letterSpacing: "-0.045em",
        lineHeight: 0.98,
        color: "var(--text-primary)",
        margin: 0,
        textAlign: align,
      }}
    >
      {lines.map((line, index) => (
        <motion.span
          key={line}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration,
            delay: reduce ? 0 : index * 0.14,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ display: "block" }}
        >
          {line}
        </motion.span>
      ))}
    </h1>
  );
}
