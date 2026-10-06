"use client";
// FILE: components/design/AbxPageShell.tsx
// Accent aware page shell for customer journeys.

import type { CSSProperties, ReactNode } from "react";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { RedesignFooter } from "@/components/redesign/RedesignFooter";
import {
  ABX_SPACING,
  abxAccentCssVars,
  type AbxTabAccent,
} from "@/lib/design/abraxasDesignSystem";
import { abxMotionCssVars, abxMotionTierForSurface } from "@/lib/design/abraxasMotion";

export interface AbxPageShellProps {
  children: ReactNode;
  accent?: AbxTabAccent;
  maxWidth?: number;
  withFooter?: boolean;
  contentStyle?: CSSProperties;
}

export function AbxPageShell({
  children,
  accent = "neutral",
  maxWidth = 900,
  withFooter = true,
  contentStyle,
}: AbxPageShellProps) {
  const motionTier = abxMotionTierForSurface(accent === "passport" ? "passport" : accent === "developer" ? "launchpad" : accent);

  return (
    <RedesignShell>
      <div
        className="abx-page-content abx-product-shell"
        data-abx-accent={accent}
        data-motion-tier={motionTier}
        style={{
          ...abxAccentCssVars(accent),
          ...abxMotionCssVars(),
          maxWidth,
          margin: "0 auto",
          padding: `${ABX_SPACING.sectionGap} ${ABX_SPACING.pagePadding} 0`,
          position: "relative",
          zIndex: 1,
          ...contentStyle,
        }}
      >
        {children}
      </div>
      {withFooter && <RedesignFooter />}
    </RedesignShell>
  );
}
