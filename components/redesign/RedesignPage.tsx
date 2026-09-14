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
}

export function RedesignPage({
  children,
  maxWidth = 900,
  accent = "neutral",
  withFooter = true,
}: RedesignPageProps) {
  return (
    <AbxPageShell accent={accent} maxWidth={maxWidth} withFooter={withFooter}>
      {children}
    </AbxPageShell>
  );
}
