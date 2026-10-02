"use client";
// FILE: lib/motion/Reveal.tsx
// Scroll-triggered entrance wrapper. Fades + rises into view once.
// Honors prefers-reduced-motion. Drop-in around any block of content.

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import type { AbxMotionRole, AbxMotionTier } from "@/lib/design/abraxasMotion";
import { abxFadeUpVariants, abxMotionTransition, abxRevealDistance, abxStaggerDelay } from "./abxMotionFramer";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  /** Index for staggered sequences (uses --abx-stagger-sm when delay omitted) */
  staggerIndex?: number;
  /** vertical travel distance in px (default from motion tokens) */
  y?: number;
  /** Semantic motion role — drives duration and easing */
  motionRole?: AbxMotionRole;
  /** Surface intensity tier */
  tier?: AbxMotionTier;
  /** play every time it enters the viewport instead of just once */
  repeat?: boolean;
  style?: CSSProperties;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}

export function Reveal({
  children,
  delay,
  staggerIndex,
  y,
  motionRole = "reveal",
  tier,
  repeat = false,
  style,
  className,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();
  const resolvedDelay = delay ?? (staggerIndex != null ? abxStaggerDelay(staggerIndex) : 0);
  const travel = y ?? abxRevealDistance();

  const variants: Variants = {
    hidden: abxFadeUpVariants(motionRole, { y: travel, reduce: !!reduce, tier }).hidden!,
    show: {
      opacity: 1,
      y: 0,
      transition: abxMotionTransition(motionRole, { delay: reduce ? 0 : resolvedDelay, tier }),
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
