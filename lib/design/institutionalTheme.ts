// FILE: lib/design/institutionalTheme.ts
// Gold/violet institutional palette — matches boot screen, flows through shell + CTAs.

import type { CSSProperties } from "react";

/** Primary brand accent — institutional gold */
export const INSTITUTIONAL_GOLD = "#E8C547";
export const INSTITUTIONAL_GOLD_DEEP = "#C9A227";
export const INSTITUTIONAL_GOLD_PALE = "#F5E6A8";

/** Secondary accent — protocol violet */
export const INSTITUTIONAL_VIOLET = "#A78BFA";
export const INSTITUTIONAL_VIOLET_DEEP = "#8B5CF6";

/** Verification / attestation — keep green for trust-state semantics */
export const INSTITUTIONAL_VERIFY = "#10B981";

/** Default marketing accent (prefer CSS var(--accent) in new code) */
export const INSTITUTIONAL_ACCENT = INSTITUTIONAL_GOLD;

export const INSTITUTIONAL_SHELL_BG =
  "linear-gradient(165deg, #04050A 0%, #0A0814 45%, #050508 100%)";

export const INSTITUTIONAL_GRADIENT_TEXT =
  `linear-gradient(90deg, ${INSTITUTIONAL_GOLD} 0%, ${INSTITUTIONAL_GOLD_PALE} 50%, ${INSTITUTIONAL_VIOLET} 100%)`;

export const INSTITUTIONAL_PRIMARY_BTN_BG =
  `linear-gradient(135deg, ${INSTITUTIONAL_GOLD} 0%, ${INSTITUTIONAL_GOLD_DEEP} 100%)`;

export const INSTITUTIONAL_PRIMARY_BTN_TEXT = "#0A0814";

export const INSTITUTIONAL_GLASS = {
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(8px)",
} as const;

/** High-contrast text on institutional dark backgrounds (WCAG AA+) */
export const TEXT_ON_DARK = {
  primary: "#FAFAFA",
  secondary: "#D4D4D8",
  caption: "#A1A1AA",
  eyebrow: "#C4B5FD",
  gold: "#F5E6A8",
  violet: "#C4B5FD",
} as const;

/** Inline style helper for gradient headline spans — includes solid fallback color */
export const gradientTextStyle: CSSProperties = {
  color: INSTITUTIONAL_GOLD_PALE,
  background: INSTITUTIONAL_GRADIENT_TEXT,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
};

