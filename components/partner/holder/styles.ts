// FILE: components/partner/holder/styles.ts
// Shared holder verification surface styles.

import type { CSSProperties } from "react";
import { ABX_FONT_SANS, ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";

export const HOLDER_FONT = ABX_FONT_SANS;
export const HOLDER_MONO = ABX_FONT_MONO;

export const holderSection: CSSProperties = {
  margin: "0 0 1rem",
  padding: "1rem 1.05rem",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.03)",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  maxWidth: "100%",
};

export const holderEyebrow: CSSProperties = {
  margin: 0,
  fontFamily: HOLDER_MONO,
  fontSize: "0.58rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-muted, #9ca3af)",
};

export const holderTitle: CSSProperties = {
  margin: "0.2rem 0 0",
  fontFamily: HOLDER_FONT,
  fontSize: "1.05rem",
  fontWeight: 800,
  lineHeight: 1.35,
  color: "var(--text-primary, #f4f4f5)",
};

export const holderBody: CSSProperties = {
  margin: 0,
  fontFamily: HOLDER_FONT,
  fontSize: "0.82rem",
  lineHeight: 1.55,
  color: "var(--text-secondary, #d1d5db)",
};

export const sandboxBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  marginBottom: "0.75rem",
  padding: "0.28rem 0.55rem",
  borderRadius: 999,
  border: "1px solid rgba(244,162,97,0.45)",
  background: "rgba(244,162,97,0.12)",
  fontFamily: HOLDER_MONO,
  fontSize: "0.58rem",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#F4A261",
};
