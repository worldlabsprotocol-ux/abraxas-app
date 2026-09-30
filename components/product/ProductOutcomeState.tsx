"use client";
// FILE: components/product/ProductOutcomeState.tsx
// Success, error, empty, and info states with one optional primary action.

import type { ReactNode } from "react";
import { Btn } from "@/components/redesign/ui";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;

export type ProductOutcomeKind = "success" | "error" | "empty" | "info";

const TONE: Record<ProductOutcomeKind, { border: string; background: string; accent: string }> = {
  success: {
    border: "rgba(16,185,129,0.35)",
    background: "rgba(16,185,129,0.08)",
    accent: "#10B981",
  },
  error: {
    border: "rgba(239,68,68,0.35)",
    background: "rgba(239,68,68,0.08)",
    accent: "#EF4444",
  },
  empty: {
    border: "var(--border-strong)",
    background: "var(--surface-inset)",
    accent: "var(--text-muted)",
  },
  info: {
    border: "rgba(96,165,250,0.35)",
    background: "rgba(96,165,250,0.08)",
    accent: "#60A5FA",
  },
};

export function ProductOutcomeState({
  kind,
  title,
  detail,
  actionLabel,
  onAction,
  href,
  children,
}: {
  kind: ProductOutcomeKind;
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  children?: ReactNode;
}) {
  const tone = TONE[kind];

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      style={{
        borderRadius: 14,
        border: `1px solid ${tone.border}`,
        background: tone.background,
        padding: "1rem 1.05rem",
      }}
    >
      <p style={{
        fontFamily: FONT,
        fontSize: "0.62rem",
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: tone.accent,
        margin: "0 0 0.35rem",
      }}>
        {kind === "success" ? "Complete" : kind === "error" ? "Action needed" : kind === "empty" ? "Nothing here yet" : "Notice"}
      </p>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.92rem",
        fontWeight: 800,
        color: "var(--text-primary)",
        margin: "0 0 0.35rem",
      }}>
        {title}
      </p>
      {detail && (
        <p style={{
          fontFamily: FONT,
          fontSize: "0.76rem",
          lineHeight: 1.55,
          color: "var(--text-secondary)",
          margin: "0 0 0.65rem",
        }}>
          {detail}
        </p>
      )}
      {children}
      {(actionLabel && (onAction || href)) && (
        <Btn size="sm" href={href} onClick={onAction}>
          {actionLabel}
        </Btn>
      )}
    </div>
  );
}
