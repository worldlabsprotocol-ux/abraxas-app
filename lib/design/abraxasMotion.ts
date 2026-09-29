// FILE: lib/design/abraxasMotion.ts
// Abraxas motion roles — single source for durations, easing, and CSS custom properties.

export const ABX_MOTION = {
  /** Button press, copy confirm, chip select */
  micro: { durationMs: 140, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  /** Card hover, panel swap, option reveal */
  surface: { durationMs: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  /** Protocol step advance, privacy boundary crossing */
  protocol: { durationMs: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  /** Major section reveal, before/after transition */
  reveal: { durationMs: 560, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
} as const;

export type AbxMotionRole = keyof typeof ABX_MOTION;

export function abxMotionCssVars(): Record<string, string> {
  return {
    "--abx-motion-micro": `${ABX_MOTION.micro.durationMs}ms`,
    "--abx-motion-surface": `${ABX_MOTION.surface.durationMs}ms`,
    "--abx-motion-protocol": `${ABX_MOTION.protocol.durationMs}ms`,
    "--abx-motion-reveal": `${ABX_MOTION.reveal.durationMs}ms`,
    "--abx-ease-out": ABX_MOTION.surface.easing,
    "--abx-ease-reveal": ABX_MOTION.reveal.easing,
  };
}

export function abxMotionDuration(role: AbxMotionRole): number {
  return ABX_MOTION[role].durationMs;
}
