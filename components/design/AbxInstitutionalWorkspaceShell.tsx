// FILE: components/design/AbxInstitutionalWorkspaceShell.tsx
// Shared DeFi institutional console frame (Integration Studio + Launchpad).

import type { ReactNode } from "react";
import { AbxProductAtmosphere } from "@/components/design/AbxProductAtmosphere";

export function AbxInstitutionalWorkspaceShell({
  children,
  className = "",
  "aria-label": ariaLabel = "Institutional workspace",
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <section
      className={`abx-inst-workspace-shell${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel}
    >
      <AbxProductAtmosphere tier="expressive" />
      <div className="abx-inst-workspace-shell__content">{children}</div>
    </section>
  );
}
