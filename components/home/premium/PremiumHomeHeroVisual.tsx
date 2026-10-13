import { ABRAXAS_BRAND_GREEN, OFFICIAL_EMBLEM_HERO_RESPONSIVE } from "@/lib/brand/officialBrandAssets";
import { preload } from "react-dom";

const { mobile, tablet, desktop, retina } = OFFICIAL_EMBLEM_HERO_RESPONSIVE;

/** Server-rendered hero emblem — priority load, responsive official WebP (no lazy LCP deferral). */
export function PremiumHomeHeroVisual() {
  preload(mobile.src, { as: "image", fetchPriority: "high" });

  return (
    <div className="abx-cinematic-hero__visual">
      <div className="abx-cinematic-hero__glow" aria-hidden="true" />
      <div className="abx-cinematic-hero__emblem-wrap abx-cinematic-hero__emblem-wrap--static">
        <picture>
          <source
            type="image/webp"
            media="(max-width: 480px)"
            srcSet={`${mobile.src} ${mobile.width}w`}
          />
          <source
            type="image/webp"
            media="(max-width: 960px)"
            srcSet={`${tablet.src} ${tablet.width}w`}
          />
          <source
            type="image/webp"
            media="(min-width: 961px)"
            srcSet={`${desktop.src} ${desktop.width}w, ${retina.src} ${retina.width}w`}
          />
          <img
            src={desktop.src}
            alt=""
            width={desktop.width}
            height={desktop.height}
            decoding="async"
            loading="eager"
            fetchPriority="high"
            className="abx-cinematic-hero__emblem"
          />
        </picture>
      </div>
      <div
        className="abx-cinematic-hero__horizon"
        aria-hidden="true"
        style={{ background: `linear-gradient(90deg, transparent, ${ABRAXAS_BRAND_GREEN}33, transparent)` }}
      />
    </div>
  );
}
