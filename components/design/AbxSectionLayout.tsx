"use client";
// FILE: components/design/AbxSectionLayout.tsx
// Segment layout wrapper — applies AbxPageShell when child pages lack their own shell.

import { usePathname } from "next/navigation";
import { AbxPageShell } from "@/components/design/AbxPageShell";
import { accentForPath, maxWidthForPath } from "@/lib/design/routeAccent";
import type { AbxTabAccent } from "@/lib/design/abraxasDesignSystem";

export interface AbxSectionLayoutProps {
  children: React.ReactNode;
  /** Override path based accent detection */
  accent?: AbxTabAccent;
  maxWidth?: number;
  withFooter?: boolean;
}

/**
 * Wraps route segment children in the premium shell.
 * Child pages that already use AbxPageShell / RedesignPage should set `skipShell` via
 * the page inventory — this layout is for legacy routes only.
 */
export function AbxSectionLayout({
  children,
  accent,
  maxWidth,
  withFooter = true,
}: AbxSectionLayoutProps) {
  const pathname = usePathname() ?? "/";
  const resolvedAccent = accent ?? accentForPath(pathname);
  const resolvedMax = maxWidth ?? maxWidthForPath(pathname);

  return (
    <AbxPageShell accent={resolvedAccent} maxWidth={resolvedMax} withFooter={withFooter}>
      {children}
    </AbxPageShell>
  );
}
