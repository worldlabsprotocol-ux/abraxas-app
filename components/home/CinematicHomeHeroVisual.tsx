"use client";

import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { OFFICIAL_BRAND_ASSETS, ABRAXAS_BRAND_GREEN } from "@/lib/brand/officialBrandAssets";

/** Emblem focal with restrained green light — no particle storms. */
export function CinematicHomeHeroVisual() {
  const reduceMotion = useReducedMotion();
  const { emblem } = OFFICIAL_BRAND_ASSETS;

  return (
    <div className="abx-cinematic-hero__visual" aria-hidden="true">
      <div className="abx-cinematic-hero__glow" />
      <div className={`abx-cinematic-hero__emblem-wrap${reduceMotion ? " abx-cinematic-hero__emblem-wrap--static" : ""}`}>
        <Image
          src={emblem.src}
          alt=""
          width={480}
          height={480}
          priority
          sizes="(max-width: 960px) min(72vw, 320px), min(42vw, 420px)"
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
