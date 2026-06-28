"use client";
// FILE: lib/motion/Reveal.tsx
// Scroll-triggered entrance wrapper. Fades + rises into view once.
// Honors prefers-reduced-motion. Drop-in around any block of content.

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  /** vertical travel distance in px (default 24) */
  y?: number;
  /** play every time it enters the viewport instead of just once */
  repeat?: boolean;
  style?: CSSProperties;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}

export function Reveal({
  children,
  delay = 0,
  y = 24,
  repeat = false,
  style,
  className,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : y },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
    },
  };

  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      style={style}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: !repeat, amount: 0.15, margin: "0px 0px -8% 0px" }}
    >
      {children}
    </MotionTag>
  );
}
