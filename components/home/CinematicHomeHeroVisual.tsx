"use client";

import Image from "next/image";
import { ABRAXAS_BRAND_GREEN, OFFICIAL_EMBLEM_HERO_WEBP } from "@/lib/brand/officialBrandAssets";

/** Emblem focal with restrained green light — no particle storms. */
export function CinematicHomeHeroVisual() {

  return (
    <div className="abx-cinematic-hero__visual" aria-hidden="true">
      <div className="abx-cinematic-hero__glow" />
      <div className="abx-cinematic-hero__emblem-wrap abx-cinematic-hero__emblem-wrap--css-motion">
        <Image
          src={OFFICIAL_EMBLEM_HERO_WEBP.src}
          alt=""
          width={OFFICIAL_EMBLEM_HERO_WEBP.width}
          height={OFFICIAL_EMBLEM_HERO_WEBP.height}
          sizes="(max-width: 960px) 72vw, 420px"
          loading="lazy"
          fetchPriority="low"
          className="abx-cinematic-hero__emblem"
        />
      </div>
      <div
        className="abx-cinematic-hero__horizon"
        style={{ background: `linear-gradient(90deg, transparent, ${ABRAXAS_BRAND_GREEN}33, transparent)` }}
      />
    </div>
  );
}
