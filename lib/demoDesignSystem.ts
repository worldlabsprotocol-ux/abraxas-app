// FILE: lib/demoDesignSystem.ts
// Premium demo design tokens — cosmic dark theme for video-ready UI.

import {
  ABRAXAS_FONT_DISPLAY,
  ABRAXAS_FONT_MONO,
  ABRAXAS_FONT_SANS,
} from "@/lib/abraxasTypography";

export const COSMIC_PALETTE = {
  void: "#050508",
  deep: "#06040c",
  surface: "#0c0a14",
  gold: "#E8C547",
  goldPale: "#F5E6A8",
  violet: "#A78BFA",
  violetDeep: "#7C3AED",
  cyan: "#22D3EE",
  emerald: "#34D399",
  rose: "#F472B6",
  textPrimary: "#FAFAFA",
  textSecondary: "rgba(255,255,255,0.62)",
  textMuted: "rgba(255,255,255,0.38)",
  glassBorder: "rgba(255,255,255,0.08)",
  glassBg: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
} as const;

export const DEMO_TYPOGRAPHY = {
  fontSans: ABRAXAS_FONT_SANS,
  fontDisplay: ABRAXAS_FONT_DISPLAY,
  fontMono: ABRAXAS_FONT_MONO,
  display: "clamp(1.5rem, 4vw, 2.25rem)",
  h1: "clamp(1.25rem, 3.2vw, 1.75rem)",
  h2: "clamp(1rem, 2.5vw, 1.35rem)",
  body: "clamp(0.82rem, 2vw, 0.95rem)",
  caption: "0.72rem",
  micro: "0.58rem",
} as const;

export const DEMO_MOTION = {
  easeOut: [0.22, 1, 0.36, 1] as const,
  spring: { type: "spring" as const, stiffness: 280, damping: 26 },
  glowPulse: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const },
};
