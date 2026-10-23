"use client";
// FILE: components/home/defi/AbraxasHeroCenterpiece.tsx
// Living sphere hero — static trust object with ambient depth (no sweep / scan motion).

import Image from "next/image";
import { LIVING_SPHERE_BRAND } from "@/lib/brand/livingSphereBrandAssets";

export function AbraxasHeroCenterpiece() {
  return (
    <div
      className="abx-hero-emblem-env abx-hero-emblem-env--living-sphere abx-hero-emblem-env--static"
      aria-hidden="true"
    >
      <div className="abx-hero-emblem-env__floor" />
      <div className="abx-hero-emblem-env__light-cone" />
      <div className="abx-hero-emblem-env__halo" />
      <div className="abx-hero-emblem-env__stage">
        <div className="abx-hero-emblem-env__parallax">
          <div className="abx-hero-emblem-env__mark">
            <Image
              src={LIVING_SPHERE_BRAND.hero.src}
              alt=""
              width={LIVING_SPHERE_BRAND.hero.width}
              height={LIVING_SPHERE_BRAND.hero.height}
              priority
              fetchPriority="high"
              sizes="(max-width: 959px) min(88vw, 400px), min(42vw, 520px)"
              className="abx-hero-emblem-env__emblem"
            />
          </div>
        </div>
      </div>
      <div className="abx-hero-emblem-env__reflection" aria-hidden="true" />
    </div>
  );
}
