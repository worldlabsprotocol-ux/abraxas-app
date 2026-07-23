// FILE: components/cielo/cieloBookingStyles.ts
// Shared styles for Cielo booking / calendar. institutional redesign.

import type { CSSProperties } from "react";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

export const CIELO_FONT = ABRAXAS_FONT_SANS;
export const CIELO_MONO = ABRAXAS_FONT_MONO;
export const CIELO_ACCENT = "var(--accent, #E8C547)";
export const CIELO_VERIFY = "#10B981";
export const CIELO_PENDING = "#F59E0B";
export const CIELO_BLOCKED = "#EF4444";

export const cieloPanelStyle: CSSProperties = {
  borderRadius: "var(--radius-lg, 18px)",
  border: "1px solid var(--border-strong, var(--border))",
  background: "var(--surface-raised)",
  boxShadow: "var(--shadow-card)",
  overflow: "hidden",
};

export const cieloInputStyle: CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.85rem",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text-primary)",
  fontFamily: CIELO_FONT,
  fontSize: "16px",
  boxSizing: "border-box",
  outline: "none",
};

export const cieloEyebrowStyle: CSSProperties = {
  fontFamily: CIELO_MONO,
  fontSize: "0.62rem",
  fontWeight: 700,
  color: CIELO_ACCENT,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: "0.35rem",
};
