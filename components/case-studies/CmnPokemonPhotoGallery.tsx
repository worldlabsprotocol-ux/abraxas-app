"use client";
// FILE: components/case-studies/CmnPokemonPhotoGallery.tsx
// PSA Pokémon slab photos — cmn1.jpg … cmn29.jpg (no cmn8) under public/assets/

import { useState } from "react";
import { CMN_POKEMON_GALLERY_PATHS } from "@/lib/cmnPokemonCaseStudy";
import { cmnDesignsSlideshowPaths } from "@/lib/cmnDesignsMedia";
import { CMN_DESIGNS_HERO_SRC } from "@/lib/cmnDesignsDisplay";
import { CmnSlabPhoto } from "@/components/registry/CmnSlabPhoto";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const PATHS = cmnDesignsSlideshowPaths();

export function CmnPokemonPhotoGallery({ altPrefix }: { altPrefix: string }) {
  const [active, setActive] = useState(0);
  const main = PATHS[active] ?? CMN_DESIGNS_HERO_SRC;

  return (
    <div>
      <div style={{
        borderRadius: 14, overflow: "hidden", marginBottom: "0.65rem",
        border: "1px solid var(--border-strong)", aspectRatio: "4/3",
        background: "#06090B", position: "relative",
      }}>
        <CmnSlabPhoto src={main} alt={`${altPrefix} ${active + 1}`} fill />
      </div>

      {PATHS.length > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
          {PATHS.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View slab ${i + 1}`}
              style={{
                padding: 0, border: `2px solid ${i === active ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 8, overflow: "hidden", width: 72, height: 52, cursor: "pointer",
                opacity: i === active ? 1 : 0.7, background: "#0e1318",
              }}
            >
              <CmnSlabPhoto src={src} alt="" height={52} compact />
            </button>
          ))}
        </div>
      )}

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.65rem", lineHeight: 1.55 }}>
        {PATHS.length} of {CMN_POKEMON_GALLERY_PATHS.length} slab photos on file · hero: cmn21.jpg
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem" }}>
        {[
          { label: "Grading", value: "PSA", sub: "Professional Sports Authenticator" },
          { label: "Slabs", value: "28 on file", sub: "Photographed PSA slabs" },
          { label: "Status", value: "Not for sale", sub: "Registry reference" },
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
    </div>
  );
}
