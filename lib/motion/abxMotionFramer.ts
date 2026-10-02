// FILE: lib/motion/abxMotionFramer.ts
// Bridge Abraxas semantic motion roles → Framer Motion transitions and variants.

import type { Transition, Variants } from "framer-motion";
import {
  ABX_MOTION,
  type AbxMotionRole,
  type AbxMotionTier,
} from "@/lib/design/abraxasMotion";

const TIER_SCALE: Record<AbxMotionTier, number> = {
  cinematic: 1,
  expressive: 0.92,
  calm: 0.85,
};

function parseBezier(easing: string): [number, number, number, number] {
  const match = easing.match(/cubic-bezier\(([^)]+)\)/);
  if (!match) return [0.22, 1, 0.36, 1];
  const parts = match[1].split(",").map((v) => parseFloat(v.trim()));
  if (parts.length !== 4 || parts.some(Number.isNaN)) return [0.22, 1, 0.36, 1];
  return parts as [number, number, number, number];
}

export function abxMotionTransition(
  role: AbxMotionRole,
  opts?: { delay?: number; tier?: AbxMotionTier },
): Transition {
  const { durationMs, easing } = ABX_MOTION[role];
  const scale = opts?.tier ? TIER_SCALE[opts.tier] : 1;
  return {
    duration: (durationMs / 1000) * scale,
    ease: parseBezier(easing),
    ...(opts?.delay != null ? { delay: opts.delay } : {}),
  };
}

export function abxStaggerDelay(index: number, size: "sm" | "md" = "sm"): number {
  return index * (size === "sm" ? 0.06 : 0.12);
}

export function abxRevealDistance(): number {
  return 18;
}

export function abxFadeUpVariants(
  role: AbxMotionRole = "reveal",
  opts?: { y?: number; reduce?: boolean; tier?: AbxMotionTier },
): Variants {
  const y = opts?.reduce ? 0 : (opts?.y ?? abxRevealDistance());
  const transition = abxMotionTransition(role, { tier: opts?.tier });
  return {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition },
  };
}

export function abxObjectEnterVariants(opts?: { reduce?: boolean; tier?: AbxMotionTier }): Variants {
  const y = opts?.reduce ? 0 : 12;
  const scale = opts?.reduce ? 1 : 0.98;
  return {
    hidden: { opacity: 0, y, scale },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: abxMotionTransition("surface", { tier: opts?.tier }),
    },
  };
}

export function abxProofResolveVariants(opts?: { reduce?: boolean }): Variants {
  const y = opts?.reduce ? 0 : 6;
  return {
    hidden: { opacity: 0, y, scale: opts?.reduce ? 1 : 0.97 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: abxMotionTransition("verify"),
    },
  };
}
