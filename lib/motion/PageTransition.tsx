"use client";
// FILE: lib/motion/PageTransition.tsx
// Per-navigation entrance animation. Wired through app/template.tsx so
// every route fades + rises on mount. App Router re-mounts templates on
// navigation, which gives smooth page transitions without manual
// AnimatePresence plumbing. Honors prefers-reduced-motion.

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ minHeight: "100%" }}
    >
      {children}
    </motion.div>
  );
}
