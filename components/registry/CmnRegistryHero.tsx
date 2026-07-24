"use client";
// FILE: components/registry/CmnRegistryHero.tsx
// Single featured PSA slab — vault teaser until full catalog photography ships.

import { CMN_DESIGNS_HERO_SRC } from "@/lib/cmnDesignsDisplay";
import { CMN_POKEMON_TEASER } from "@/lib/cmnPokemonCaseStudy";
import { CmnSlabPhoto } from "@/components/registry/CmnSlabPhoto";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function CmnRegistryHero({
  alt,
  height = 220,
  showComingSoon = true,
}: {
  alt: string;
  height?: number;
  showComingSoon?: boolean;
}) {
  return (
    <div style={{ position: "relative", height, background: "#06090B", overflow: "hidden" }}>
      <CmnSlabPhoto src={CMN_DESIGNS_HERO_SRC} alt={alt} fill featured />

      {showComingSoon && (
        <div style={{
          position: "absolute", bottom: 10, left: 10, right: 10, zIndex: 2,
          display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.5rem",
        }}>
          <span style={{
            fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase",
            padding: "0.3rem 0.55rem", borderRadius: 999,
            background: "rgba(6,9,11,0.82)", color: "rgba(255,255,255,0.88)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(6px)",
          }}>
            {CMN_POKEMON_TEASER.badge}
          </span>
        </div>
      )}
    </div>
  );
}
