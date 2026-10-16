"use client";
// FILE: components/home/premium/PremiumHomeHeroVisualEnhanced.tsx
// Animated official emblem inside the established asymmetric premium hero visual slot.

import dynamic from "next/dynamic";
import Image from "next/image";
import { ABRAXAS_BRAND_GREEN, OFFICIAL_EMBLEM_HERO_WEBP } from "@/lib/brand/officialBrandAssets";

const AbraxasHeroCenterpiece = dynamic(
  () => import("@/components/home/defi/AbraxasHeroCenterpiece").then((m) => m.AbraxasHeroCenterpiece),
  {
    ssr: false,
    loading: () => (
      <div className="abx-premium-hero__visual-stage" aria-hidden="true">
        <div className="abx-cinematic-hero__glow" />
        <Image
          src={OFFICIAL_EMBLEM_HERO_WEBP.src}
          alt=""
          width={OFFICIAL_EMBLEM_HERO_WEBP.width}
          height={OFFICIAL_EMBLEM_HERO_WEBP.height}
          priority
          className="abx-cinematic-hero__emblem"
        />
      </div>
    ),
  },
);

export function PremiumHomeHeroVisualEnhanced() {
  return (
    <div className="abx-cinematic-hero__visual abx-premium-hero__visual-enhanced" aria-hidden="true">
      <div className="abx-cinematic-hero__glow abx-premium-hero__visual-glow" />
      <div className="abx-premium-hero__visual-stage">
        <AbraxasHeroCenterpiece />
      </div>
      <div
        className="abx-cinematic-hero__horizon abx-premium-hero__visual-horizon"
        style={{ background: `linear-gradient(90deg, transparent, ${ABRAXAS_BRAND_GREEN}44, transparent)` }}
      />
    </div>
  );
}
