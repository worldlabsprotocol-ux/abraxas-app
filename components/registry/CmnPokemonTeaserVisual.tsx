// FILE: components/registry/CmnPokemonTeaserVisual.tsx
// Black institutional placeholder until vault photography ships.

import { CMN_POKEMON_TEASER } from "@/lib/cmnPokemonCaseStudy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const DISPLAY = "'Space Grotesk','Inter',system-ui,sans-serif";

export function CmnPokemonTeaserVisual({
  height = 220,
  subtitle,
}: {
  height?: number;
  subtitle?: string;
}) {
  return (
    <div
      aria-label={CMN_POKEMON_TEASER.badge}
      style={{
        height,
        width: "100%",
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.45rem",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      <div style={{
        fontFamily: DISPLAY,
        fontSize: height < 180 ? "0.72rem" : "0.82rem",
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.42)",
      }}>
        PSA Pokémon · Graded Collection
      </div>
      <div style={{
        fontFamily: DISPLAY,
        fontSize: height < 180 ? "1rem" : "1.15rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.92)",
        lineHeight: 1.2,
      }}>
        {CMN_POKEMON_TEASER.badge}
      </div>
      {subtitle && (
        <div style={{
          fontFamily: FONT,
          fontSize: "0.62rem",
          fontWeight: 500,
          color: "rgba(255,255,255,0.38)",
          maxWidth: 220,
          lineHeight: 1.45,
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
