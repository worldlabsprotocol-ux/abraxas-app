"use client";
// FILE: components/case-studies/CmnPokemonPhotoGallery.tsx
// Black institutional teaser until vault photography ships.

import { CMN_POKEMON_ASSET, CMN_POKEMON_TEASER } from "@/lib/cmnPokemonCaseStudy";
import { CmnPokemonTeaserVisual } from "@/components/registry/CmnPokemonTeaserVisual";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function CmnPokemonPhotoGallery({ altPrefix: _altPrefix }: { altPrefix: string }) {
  return (
    <div>
      <div style={{
        borderRadius: 14, overflow: "hidden", marginBottom: "0.75rem",
        border: "1px solid var(--border-strong)",
        background: "#000000",
      }}>
        <CmnPokemonTeaserVisual height={280} subtitle="Vault photography publishing soon" />
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "0.5rem", marginBottom: "0.85rem",
      }}>
        {[
          { label: "Grading", value: "PSA", sub: "Professional Sports Authenticator" },
          { label: "Catalog", value: "Expanding", sub: CMN_POKEMON_TEASER.badge },
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
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
          {CMN_POKEMON_TEASER.body}
        </p>
      </div>
    </div>
  );
}
