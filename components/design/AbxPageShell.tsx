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
import { AbxProductAtmosphere, type AbxProductAtmosphereTier } from "@/components/design/AbxProductAtmosphere";

export interface AbxPageShellProps {
  children: ReactNode;
  accent?: AbxTabAccent;
  maxWidth?: number;
  withFooter?: boolean;
  contentStyle?: CSSProperties;
  className?: string;
  /** Subtle grid/glow continuity with homepage (calm tier on holder journeys). */
  visualAtmosphere?: boolean | AbxProductAtmosphereTier;
}

export function AbxPageShell({
  children,
  accent = "neutral",
  maxWidth = 900,
  withFooter = true,
  contentStyle,
  className,
  visualAtmosphere = false,
}: AbxPageShellProps) {
  const motionTier = abxMotionTierForSurface(accent === "passport" ? "passport" : accent === "developer" ? "launchpad" : accent);
  const atmosphereTier: AbxProductAtmosphereTier | false =
    visualAtmosphere === true ? "calm" : visualAtmosphere || false;

  return (
    <RedesignShell>
      <div
        className={`abx-page-content abx-product-shell${atmosphereTier ? " abx-product-shell--atmospheric" : ""}${className ? ` ${className}` : ""}`}
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
        {atmosphereTier ? <AbxProductAtmosphere tier={atmosphereTier} /> : null}
        {children}
      </div>
      {withFooter && <RedesignFooter />}
    </RedesignShell>
  );
}
