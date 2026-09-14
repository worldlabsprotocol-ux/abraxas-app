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

/** Rich midnight foundation tones (avoid pure black). */
export const ABX_MIDNIGHT = {
  navy900: "#09111F",
  navy800: "#0D1526",
  navy700: "#10182B",
  navy650: "#111A2E",
  navy600: "#162038",
} as const;

export const ABX_SHELL_GRADIENT =
  `linear-gradient(165deg, ${ABX_MIDNIGHT.navy900} 0%, ${ABX_MIDNIGHT.navy800} 38%, ${ABX_MIDNIGHT.navy700} 72%, ${ABX_MIDNIGHT.navy900} 100%)`;

/** Soft radial color fields per route accent for atmospheric backgrounds. */
export const ABX_ATMOSPHERE: Record<
  AbxTabAccent,
  { primary: string; secondary: string; tertiary: string }
> = {
  home: {
    primary: "rgba(232, 197, 71, 0.16)",
    secondary: "rgba(167, 139, 250, 0.09)",
    tertiary: "rgba(232, 197, 71, 0.06)",
  },
  passport: {
    primary: "rgba(16, 185, 129, 0.15)",
    secondary: "rgba(45, 212, 191, 0.10)",
    tertiary: "rgba(34, 211, 238, 0.06)",
  },
  partner: {
    primary: "rgba(244, 162, 97, 0.13)",
    secondary: "rgba(45, 212, 191, 0.10)",
    tertiary: "rgba(16, 185, 129, 0.06)",
  },
  verify: {
    primary: "rgba(96, 165, 250, 0.14)",
    secondary: "rgba(167, 139, 250, 0.09)",
    tertiary: "rgba(34, 211, 238, 0.06)",
  },
  admin: {
    primary: "rgba(167, 139, 250, 0.14)",
    secondary: "rgba(96, 165, 250, 0.09)",
    tertiary: "rgba(167, 139, 250, 0.05)",
  },
  developer: {
    primary: "rgba(34, 211, 238, 0.13)",
    secondary: "rgba(96, 165, 250, 0.10)",
    tertiary: "rgba(167, 139, 250, 0.06)",
  },
  legal: {
    primary: "rgba(244, 162, 97, 0.12)",
    secondary: "rgba(232, 197, 71, 0.08)",
    tertiary: "rgba(244, 162, 97, 0.05)",
  },
  neutral: {
    primary: "rgba(96, 165, 250, 0.08)",
    secondary: "rgba(167, 139, 250, 0.06)",
    tertiary: "rgba(45, 212, 191, 0.04)",
  },
};

export const ABX_TAB_ACCENTS: Record<
  AbxTabAccent,
  { color: string; faint: string; border: string; glow: string; gradient: string }
> = {
  home: {
    color: "#E8C547",
    faint: "rgba(232, 197, 71, 0.14)",
    border: "rgba(232, 197, 71, 0.42)",
    glow: "0 8px 40px rgba(232, 197, 71, 0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
    gradient: "linear-gradient(135deg, rgba(232,197,71,0.16) 0%, rgba(167,139,250,0.09) 100%)",
  },
  passport: {
    color: "#10B981",
    faint: "rgba(16, 185, 129, 0.14)",
    border: "rgba(16, 185, 129, 0.42)",
    glow: "0 8px 40px rgba(16, 185, 129, 0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.16) 0%, rgba(34,211,238,0.09) 100%)",
  },
  partner: {
    color: "#F4A261",
    faint: "rgba(244, 162, 97, 0.13)",
    border: "rgba(244, 162, 97, 0.40)",
    glow: "0 8px 40px rgba(244, 162, 97, 0.14), inset 0 1px 0 rgba(255,255,255,0.06)",
    gradient: "linear-gradient(135deg, rgba(244,162,97,0.14) 0%, rgba(45,212,191,0.09) 100%)",
  },
  verify: {
    color: "#60A5FA",
    faint: "rgba(96, 165, 250, 0.14)",
    border: "rgba(96, 165, 250, 0.42)",
    glow: "0 8px 40px rgba(96, 165, 250, 0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
    gradient: "linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(167,139,250,0.09) 100%)",
  },
  admin: {
    color: "#A78BFA",
    faint: "rgba(167, 139, 250, 0.15)",
    border: "rgba(167, 139, 250, 0.42)",
    glow: "0 8px 40px rgba(167, 139, 250, 0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
    gradient: "linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(96,165,250,0.09) 100%)",
  },
  developer: {
    color: "#22D3EE",
    faint: "rgba(34, 211, 238, 0.14)",
    border: "rgba(34, 211, 238, 0.42)",
    glow: "0 8px 40px rgba(34, 211, 238, 0.14), inset 0 1px 0 rgba(255,255,255,0.06)",
    gradient: "linear-gradient(135deg, rgba(34,211,238,0.14) 0%, rgba(96,165,250,0.09) 100%)",
  },
  legal: {
    color: "#F4A261",
    faint: "rgba(244, 162, 97, 0.13)",
    border: "rgba(244, 162, 97, 0.40)",
    glow: "0 8px 40px rgba(244, 162, 97, 0.14), inset 0 1px 0 rgba(255,255,255,0.06)",
    gradient: "linear-gradient(135deg, rgba(244,162,97,0.13) 0%, rgba(232,197,71,0.07) 100%)",
  },
  neutral: {
    color: "#D4D4D8",
    faint: "rgba(148, 163, 184, 0.08)",
    border: "rgba(148, 163, 184, 0.18)",
    glow: "0 8px 32px rgba(4, 10, 24, 0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
    gradient: "linear-gradient(180deg, rgba(148,163,184,0.06) 0%, rgba(9,17,31,0.4) 100%)",
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
