// Institutional V2 design tokens — monochrome foundation, limited mineral gold accent.

import { MONO, MONO_SEMANTIC } from "@/lib/design/monochromeSystem";

export const ABX_V2 = {
  graphite: MONO.bgPrimary,
  charcoal: MONO.bgSecondary,
  surface: MONO.surfaceElevated,
  textPrimary: MONO.textPrimary,
  textSecondary: MONO.textSecondary,
  border: MONO.borderSubtle,
  gold: MONO.mineralGold,
  verifyGreen: MONO_SEMANTIC.verified,
  evidenceBlue: MONO.textSecondary,
  contentMaxPx: 1320,
  gridColumns: 12,
  motionMicroMs: 160,
  motionPanelMs: 220,
} as const;

export const ABX_V2_SHELL_CLASS = "abx-v2-shell";
