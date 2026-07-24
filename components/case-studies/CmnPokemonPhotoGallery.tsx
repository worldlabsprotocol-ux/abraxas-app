"use client";
// FILE: components/case-studies/CmnPokemonPhotoGallery.tsx
// Featured PSA slab + vault teaser until full catalog photography is ready.

import { CMN_DESIGNS_HERO_SRC } from "@/lib/cmnDesignsDisplay";
import {
  CMN_POKEMON_ASSET,
  CMN_POKEMON_FEATURED_SLAB,
  CMN_POKEMON_TEASER,
} from "@/lib/cmnPokemonCaseStudy";
import { CmnSlabPhoto } from "@/components/registry/CmnSlabPhoto";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function CmnPokemonPhotoGallery({ altPrefix }: { altPrefix: string }) {
  return (
    <div>
      <div style={{
        borderRadius: 14, overflow: "hidden", marginBottom: "0.75rem",
        border: "1px solid var(--border-strong)", aspectRatio: "4/3",
        background: "#06090B", position: "relative",
      }}>
        <CmnSlabPhoto src={CMN_DESIGNS_HERO_SRC} alt={altPrefix} fill featured />
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "0.5rem", marginBottom: "0.85rem",
      }}>
        {[
          { label: "Featured slab", value: CMN_POKEMON_FEATURED_SLAB.name, sub: CMN_POKEMON_FEATURED_SLAB.set },
          { label: "Grade", value: CMN_POKEMON_FEATURED_SLAB.grade, sub: `Cert ${CMN_POKEMON_FEATURED_SLAB.cert}` },
          { label: "Status", value: "On-registry", sub: CMN_POKEMON_ASSET.stats.disposition },
        ].map(card => (
          <div key={card.label} style={{
            padding: "0.65rem", borderRadius: 10,
            background: "var(--surface)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
              {card.label}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)" }}>{card.value}</div>
            <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 2 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{
        padding: "0.85rem 1rem", borderRadius: 12,
        background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          {CMN_POKEMON_TEASER.headline}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: "0 0 0.5rem", lineHeight: 1.55 }}>
          {CMN_POKEMON_TEASER.body}
        </p>
        <span style={{
          fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
          letterSpacing: "0.06em", textTransform: "uppercase",
          color: "var(--accent)",
        }}>
          {CMN_POKEMON_TEASER.badge}
        </span>
      </div>
    </div>
  );
}
