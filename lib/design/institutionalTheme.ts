// FILE: lib/design/institutionalTheme.ts
// Monochrome institutional palette — mineral gold as identity accent only.

import type { CSSProperties } from "react";
import { MONO, MONO_SEMANTIC } from "@/lib/design/monochromeSystem";

export const INSTITUTIONAL_GOLD = MONO.mineralGold;
export const INSTITUTIONAL_GOLD_DEEP = "#A8893F";
export const INSTITUTIONAL_GOLD_PALE = "#E8E0C8";

export const INSTITUTIONAL_VIOLET = MONO.textSecondary;
export const INSTITUTIONAL_VIOLET_DEEP = MONO.textSecondary;

export const INSTITUTIONAL_VERIFY = MONO_SEMANTIC.verified;

export const INSTITUTIONAL_ACCENT = MONO.mineralGold;

export const INSTITUTIONAL_SHELL_BG = MONO.bgPrimary;

export const INSTITUTIONAL_GRADIENT_TEXT = "none";

export const INSTITUTIONAL_PRIMARY_BTN_BG = MONO.actionPrimaryBg;
export const INSTITUTIONAL_PRIMARY_BTN_TEXT = MONO.actionPrimaryText;

export const INSTITUTIONAL_GLASS = {
  border: "1px solid #292929",
  background: MONO.bgSecondary,
  backdropFilter: "none",
} as const;

export const TEXT_ON_DARK = {
  primary: MONO.textPrimary,
  secondary: MONO.textSecondary,
  caption: MONO.textSecondary,
  eyebrow: MONO.textSecondary,
  gold: MONO.mineralGold,
  violet: MONO.textSecondary,
} as const;

export const gradientTextStyle: CSSProperties = {
  color: MONO.textPrimary,
};
