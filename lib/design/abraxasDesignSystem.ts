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

/** Monochrome foundation (true black canvas). */
export const ABX_MIDNIGHT = {
  navy900: "#050505",
  navy800: "#101010",
  navy700: "#101010",
  navy650: "#171717",
  navy600: "#171717",
} as const;

export const ABX_SHELL_GRADIENT = ABX_MIDNIGHT.navy900;

/** Soft radial color fields per route accent for atmospheric backgrounds. */
const MONO_ATMO = {
  primary: "transparent",
  secondary: "transparent",
  tertiary: "transparent",
} as const;

export const ABX_ATMOSPHERE: Record<
  AbxTabAccent,
  { primary: string; secondary: string; tertiary: string }
> = {
  home: MONO_ATMO,
  passport: MONO_ATMO,
  partner: MONO_ATMO,
  verify: MONO_ATMO,
  admin: MONO_ATMO,
  developer: MONO_ATMO,
  legal: MONO_ATMO,
  neutral: MONO_ATMO,
};

const MONO_TAB = {
  color: "#F5F5F3",
  faint: "rgba(245, 245, 243, 0.04)",
  border: "rgba(245, 245, 243, 0.18)",
  glow: "none",
  gradient: "none",
} as const;

export const ABX_TAB_ACCENTS: Record<
  AbxTabAccent,
  { color: string; faint: string; border: string; glow: string; gradient: string }
> = {
  home: MONO_TAB,
  passport: { ...MONO_TAB, color: "#4CBB92" },
  partner: MONO_TAB,
  verify: MONO_TAB,
  admin: MONO_TAB,
  developer: MONO_TAB,
  legal: MONO_TAB,
  neutral: MONO_TAB,
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
  shell: ABX_SHELL_GRADIENT,
  partnerJourney:
    `linear-gradient(180deg, ${ABX_MIDNIGHT.navy900} 0%, ${ABX_MIDNIGHT.navy800} 48%, ${ABX_MIDNIGHT.navy700} 100%)`,
  admin:
    `linear-gradient(165deg, ${ABX_MIDNIGHT.navy900} 0%, ${ABX_MIDNIGHT.navy650} 52%, ${ABX_MIDNIGHT.navy800} 100%)`,
} as const;

export function abxAccentCssVars(accent: AbxTabAccent): Record<string, string> {
  const t = ABX_TAB_ACCENTS[accent];
  const atmo = ABX_ATMOSPHERE[accent];
  return {
    "--abx-accent": t.color,
    "--abx-accent-faint": t.faint,
    "--abx-accent-border": t.border,
    "--abx-accent-glow": t.glow,
    "--abx-accent-gradient": t.gradient,
    "--abx-atmo-primary": atmo.primary,
    "--abx-atmo-secondary": atmo.secondary,
    "--abx-atmo-tertiary": atmo.tertiary,
  };
}
