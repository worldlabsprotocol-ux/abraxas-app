"use client";
// FILE: lib/motion/MotionCard.tsx
// Hover-lift + glow card wrapper. Layout-neutral: it renders a single
// motion.div, so it can wrap existing inline-styled cards without
// changing their look — only adding lift / scale / glow on hover and a
// subtle press on tap. Honors prefers-reduced-motion.

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { springSnappy, easeOutFast } from "./variants";

interface MotionCardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
  /** rgba/hex accent used for the hover glow ring */
  glowColor?: string;
  /** disable lift (e.g. for already-selected cards) */
  disabled?: boolean;
  lift?: number;
}

export function MotionCard({
  children,
  style,
  className,
  onClick,
  glowColor = "rgba(16,185,129,0.35)",
  disabled = false,
  lift = 4,
}: MotionCardProps) {
  const reduce = useReducedMotion();
  const interactive = !disabled && !reduce;

  return (
    <motion.div
      className={className}
      style={{ willChange: "transform", ...style }}
      onClick={onClick}
      initial={false}
      whileHover={
        interactive
          ? {
              y: -lift,
              scale: 1.02,
              boxShadow: `0 22px 54px ${glowColor}, 0 0 0 1px ${glowColor}`,
              transition: springSnappy,
            }
          : undefined
      }
      whileTap={interactive ? { scale: 0.985, transition: easeOutFast } : undefined}
    >
      {children}
    </motion.div>
  );
}
