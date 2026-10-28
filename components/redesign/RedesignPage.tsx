"use client";
// FILE: components/redesign/RedesignPage.tsx
// Standard inner page wrapper: accent aware shell + content + footer.

import { AbxPageShell } from "@/components/design/AbxPageShell";
import type { AbxTabAccent } from "@/lib/design/abraxasDesignSystem";

interface RedesignPageProps {
  children: React.ReactNode;
  maxWidth?: number;
  accent?: AbxTabAccent;
  withFooter?: boolean;
  visualAtmosphere?: boolean;
}

export function RedesignPage({
  children,
  maxWidth = 900,
  accent = "neutral",
  withFooter = true,
  visualAtmosphere = false,
}: RedesignPageProps) {
  return (
    <AbxPageShell accent={accent} maxWidth={maxWidth} withFooter={withFooter} visualAtmosphere={visualAtmosphere}>
      {children}
    </AbxPageShell>
  );
}
