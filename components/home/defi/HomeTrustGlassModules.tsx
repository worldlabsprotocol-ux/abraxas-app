"use client";
// FILE: components/home/defi/HomeTrustGlassModules.tsx

import Link from "next/link";
import { DEFI_TRUST_GLASS_MODULES } from "@/lib/home/defiVisualHomeCopy";

const POSITIONS = ["tl", "tr", "bl", "br"] as const;

export function HomeTrustGlassModules() {
  return (
    <div className="abx-defi-glass-grid" aria-label="Trust capabilities">
      {DEFI_TRUST_GLASS_MODULES.map((mod, index) => (
        <Link
          key={mod.id}
          href={mod.href}
          className={`abx-defi-glass-card abx-defi-glass-card--${POSITIONS[index] ?? "tl"}`}
        >
          <p className="abx-defi-glass-card__label">{mod.label}</p>
          <p className="abx-defi-glass-card__value">{mod.value}</p>
          <p className="abx-defi-glass-card__detail">{mod.detail}</p>
        </Link>
      ))}
    </div>
  );
}
