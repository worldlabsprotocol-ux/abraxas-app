"use client";
// FILE: components/home/premium/PremiumHomeHeroVisualEnhanced.tsx
// Animated official emblem inside the established asymmetric premium hero visual slot.

import { ABRAXAS_BRAND_GREEN } from "@/lib/brand/officialBrandAssets";
import { AbraxasHeroCenterpiece } from "@/components/home/defi/AbraxasHeroCenterpiece";

export function PremiumHomeHeroVisualEnhanced() {
  return (
    <div className="abx-premium-hero__visual-enhanced" aria-hidden="true">
      <div className="abx-premium-hero__visual-stage">
        <AbraxasHeroCenterpiece />
      </div>
      <div
        className="abx-premium-hero__visual-horizon"
        style={{ background: `linear-gradient(90deg, transparent, ${ABRAXAS_BRAND_GREEN}33, transparent)` }}
      />
    </div>
  );
}
