"use client";
// FILE: components/design/AbxInnerPage.tsx
// Standard inner page chrome: header, optional actions, responsive content stack.

import type { ReactNode } from "react";
import { AbxPageHeader } from "@/components/design/AbxPrimitives";
import { ABX_SPACING, type AbxTabAccent } from "@/lib/design/abraxasDesignSystem";

export interface AbxInnerPageProps {
  accent?: AbxTabAccent;
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
  children: ReactNode;
  align?: "left" | "center";
  maxWidth?: number;
}

export function AbxInnerPage({
  accent = "neutral",
  eyebrow,
  title,
  lead,
  actions,
  children,
  align = "left",
  maxWidth = 900,
}: AbxInnerPageProps) {
  return (
    <div
      className="abx-inner-page"
      style={{
        maxWidth,
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: ABX_SPACING.stackMd,
      }}
    >
      <AbxPageHeader accent={accent} eyebrow={eyebrow} title={title} lead={lead} align={align} />
      {actions && (
        <div
          className="abx-inner-page-actions"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.65rem",
            justifyContent: align === "center" ? "center" : "flex-start",
          }}
        >
          {actions}
        </div>
      )}
      <div className="abx-inner-page-body" style={{ display: "flex", flexDirection: "column", gap: ABX_SPACING.stackMd }}>
        {children}
      </div>
    </div>
  );
}
