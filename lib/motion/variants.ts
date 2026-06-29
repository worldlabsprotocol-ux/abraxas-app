// FILE: lib/motion/variants.ts
// Central Framer Motion variant + transition library for Abraxas.
// Premium, spring-based micro-interactions tuned for a 60fps feel.
// Every consumer should pair these with `useReducedMotion()` so the
// app stays calm for users who ask for reduced motion.

import type { Variants, Transition } from "framer-motion";

// ── Shared spring / easing presets ──────────────────────────────
export const springSoft: Transition = { type: "spring", stiffness: 320, damping: 30, mass: 0.8 };
export const springSnappy: Transition = { type: "spring", stiffness: 460, damping: 26 };
export const easeOutFast: Transition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] };
export const easeOutSmooth: Transition = { duration: 0.55, ease: [0.22, 1, 0.36, 1] };

// ── Entrance: fade + rise ───────────────────────────────────────
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: easeOutSmooth },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: springSoft },
};

// ── Stagger container + item ────────────────────────────────────
export function staggerContainer(stagger = 0.07, delayChildren = 0.04): Variants {
  return {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: easeOutSmooth },
};

// ── Card hover / press micro-interaction ────────────────────────
// Use as `whileHover="hover"` / `whileTap="tap"` on a motion element,
// or read the literal objects for inline whileHover props.
export const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -4, scale: 1.012, transition: springSnappy },
  tap: { scale: 0.985, transition: easeOutFast },
};

// ── Button feedback ─────────────────────────────────────────────
export const buttonTap = { scale: 0.96, transition: easeOutFast };
export const buttonHover = { scale: 1.035, transition: springSnappy };

// ── Page / view transition ──────────────────────────────────────
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" } },
};

// ── Modal / overlay ─────────────────────────────────────────────
export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalPop: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: easeOutFast },
};
