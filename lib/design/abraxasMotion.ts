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
  /** Editorial kinetic band — slow, confident marquee */
  editorial: { durationMs: 28000, easing: "linear" },
  /** Data redaction — private fields disappear */
  redact: { durationMs: 480, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
  /** Verification resolves — decisive settle */
  verify: { durationMs: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  /** Narrow result crosses boundary */
  transfer: { durationMs: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
} as const;

export type AbxMotionRole = keyof typeof ABX_MOTION;

/** Public cinematic vs calm transactional surfaces. */
export type AbxMotionTier = "cinematic" | "expressive" | "calm";

export const ABX_MOTION_TIER_SURFACES: Record<AbxMotionTier, string[]> = {
  cinematic: ["home", "marketing", "public-story"],
  expressive: ["pricing", "integrations", "developers-entry"],
  calm: ["passport", "partner-verify", "consent", "receipt", "launchpad", "admin"],
};

export function abxMotionCssVars(): Record<string, string> {
  return {
    "--abx-motion-micro": `${ABX_MOTION.micro.durationMs}ms`,
    "--abx-motion-surface": `${ABX_MOTION.surface.durationMs}ms`,
    "--abx-motion-protocol": `${ABX_MOTION.protocol.durationMs}ms`,
    "--abx-motion-reveal": `${ABX_MOTION.reveal.durationMs}ms`,
    "--abx-motion-editorial": `${ABX_MOTION.editorial.durationMs}ms`,
    "--abx-motion-redact": `${ABX_MOTION.redact.durationMs}ms`,
    "--abx-motion-verify": `${ABX_MOTION.verify.durationMs}ms`,
    "--abx-motion-transfer": `${ABX_MOTION.transfer.durationMs}ms`,
    "--abx-ease-out": ABX_MOTION.surface.easing,
    "--abx-ease-reveal": ABX_MOTION.reveal.easing,
    "--abx-ease-redact": ABX_MOTION.redact.easing,
    "--abx-stagger-sm": "0.06s",
    "--abx-stagger-md": "0.12s",
    "--abx-reveal-distance": "18px",
  };
}

export function abxMotionDuration(role: AbxMotionRole): number {
  return ABX_MOTION[role].durationMs;
}

export function abxMotionTierForSurface(surface: string): AbxMotionTier {
  for (const [tier, surfaces] of Object.entries(ABX_MOTION_TIER_SURFACES) as Array<
    [AbxMotionTier, string[]]
  >) {
    if (surfaces.includes(surface)) return tier;
  }
  return "expressive";
}
