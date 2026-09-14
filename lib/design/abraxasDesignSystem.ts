// FILE: lib/design/abraxasDesignSystem.ts
// Shared Abraxas design tokens — tab accents, status colors, spacing, and surfaces.

import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

export const ABX_FONT_SANS = ABRAXAS_FONT_SANS;
export const ABX_FONT_DISPLAY = ABRAXAS_FONT_DISPLAY;
export const ABX_FONT_MONO = ABRAXAS_FONT_MONO;

/** Recognizable accent per major product area */
export type AbxTabAccent =
  | "home"
  | "passport"
  | "partner"
  | "verify"
  | "admin"
  | "developer"
  | "legal"
  | "neutral";

export const ABX_TAB_ACCENTS: Record<
  AbxTabAccent,
  { color: string; faint: string; border: string; glow: string; gradient: string }
> = {
  home: {
    color: "#E8C547",
    faint: "rgba(232, 197, 71, 0.12)",
    border: "rgba(232, 197, 71, 0.38)",
    glow: "0 0 48px rgba(232, 197, 71, 0.22)",
    gradient: "linear-gradient(135deg, rgba(232,197,71,0.14) 0%, rgba(167,139,250,0.08) 100%)",
  },
  passport: {
    color: "#10B981",
    faint: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.38)",
    glow: "0 0 48px rgba(16, 185, 129, 0.2)",
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(34,211,238,0.08) 100%)",
  },
  partner: {
    color: "#2DD4BF",
    faint: "rgba(45, 212, 191, 0.12)",
    border: "rgba(45, 212, 191, 0.38)",
    glow: "0 0 48px rgba(45, 212, 191, 0.2)",
    gradient: "linear-gradient(135deg, rgba(45,212,191,0.14) 0%, rgba(16,185,129,0.08) 100%)",
  },
  verify: {
    color: "#60A5FA",
    faint: "rgba(96, 165, 250, 0.12)",
    border: "rgba(96, 165, 250, 0.38)",
    glow: "0 0 48px rgba(96, 165, 250, 0.2)",
    gradient: "linear-gradient(135deg, rgba(96,165,250,0.14) 0%, rgba(167,139,250,0.08) 100%)",
  },
  admin: {
    color: "#A78BFA",
    faint: "rgba(167, 139, 250, 0.14)",
    border: "rgba(167, 139, 250, 0.38)",
    glow: "0 0 48px rgba(167, 139, 250, 0.2)",
    gradient: "linear-gradient(135deg, rgba(167,139,250,0.14) 0%, rgba(96,165,250,0.08) 100%)",
  },
  developer: {
    color: "#22D3EE",
    faint: "rgba(34, 211, 238, 0.12)",
    border: "rgba(34, 211, 238, 0.38)",
    glow: "0 0 48px rgba(34, 211, 238, 0.18)",
    gradient: "linear-gradient(135deg, rgba(34,211,238,0.12) 0%, rgba(96,165,250,0.08) 100%)",
  },
  legal: {
    color: "#F4A261",
    faint: "rgba(244, 162, 97, 0.12)",
    border: "rgba(244, 162, 97, 0.38)",
    glow: "0 0 48px rgba(244, 162, 97, 0.18)",
    gradient: "linear-gradient(135deg, rgba(244,162,97,0.12) 0%, rgba(232,197,71,0.06) 100%)",
  },
  neutral: {
    color: "#D4D4D8",
    faint: "rgba(255, 255, 255, 0.04)",
    border: "rgba(255, 255, 255, 0.1)",
    glow: "none",
    gradient: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)",
  },
};

export type AbxStatusTone = "success" | "warning" | "error" | "info" | "pending" | "neutral";

export const ABX_STATUS_COLORS: Record<
  AbxStatusTone,
  { color: string; faint: string; border: string }
> = {
  success: { color: "#10B981", faint: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)" },
  warning: { color: "#F4A261", faint: "rgba(244,162,97,0.12)", border: "rgba(244,162,97,0.35)" },
  error: { color: "#F87171", faint: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)" },
  info: { color: "#60A5FA", faint: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.35)" },
  pending: { color: "#E8C547", faint: "rgba(232,197,71,0.12)", border: "rgba(232,197,71,0.35)" },
  neutral: { color: "#A1A1AA", faint: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
};

export const ABX_SPACING = {
  pagePadding: "clamp(1.25rem, 4vw, 2rem)",
  sectionGap: "clamp(2rem, 6vw, 3.25rem)",
  cardPadding: "1.25rem 1.35rem",
  cardRadius: 16,
  cardRadiusLg: 20,
  stackSm: "0.65rem",
  stackMd: "1rem",
  stackLg: "1.5rem",
} as const;

export const ABX_TYPOGRAPHY = {
  eyebrow: {
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
  },
  h1: {
    fontSize: "clamp(1.35rem, 3.5vw, 1.75rem)",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1.2,
  },
  lead: {
    fontSize: "0.92rem",
    lineHeight: 1.65,
  },
  body: {
    fontSize: "0.88rem",
    lineHeight: 1.6,
  },
  small: {
    fontSize: "0.78rem",
    lineHeight: 1.55,
  },
} as const;

export const ABX_PAGE_BACKGROUNDS = {
  shell: "var(--shell-gradient, linear-gradient(165deg, #050508 0%, #0A0814 40%, #06040c 70%, #050508 100%))",
  partnerJourney:
    "linear-gradient(180deg, #04050a 0%, #080a12 45%, #060810 100%)",
  admin: "linear-gradient(165deg, #06070c 0%, #0a0c14 50%, #06070c 100%)",
} as const;

export function abxAccentCssVars(accent: AbxTabAccent): Record<string, string> {
  const t = ABX_TAB_ACCENTS[accent];
  return {
    "--abx-accent": t.color,
    "--abx-accent-faint": t.faint,
    "--abx-accent-border": t.border,
    "--abx-accent-glow": t.glow,
    "--abx-accent-gradient": t.gradient,
  };
}
