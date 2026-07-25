// FILE: components/registry/CmnPokemonTeaserVisual.tsx
// Black institutional placeholder — single line only (title lives on the card below).

import { CMN_POKEMON_TEASER } from "@/lib/cmnPokemonCaseStudy";

const DISPLAY = "'Space Grotesk','Inter',system-ui,sans-serif";

export function CmnPokemonTeaserVisual({ height = 220 }: { height?: number }) {
  return (
    <div
      aria-label={CMN_POKEMON_TEASER.badge}
      style={{
        height,
        width: "100%",
        background: "#000000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      <div style={{
        fontFamily: DISPLAY,
        fontSize: height < 180 ? "0.88rem" : "0.95rem",
        fontWeight: 600,
        letterSpacing: "0.11em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.78)",
        lineHeight: 1.2,
      }}>
        {CMN_POKEMON_TEASER.badge}
      </div>
    </div>
  );
}
