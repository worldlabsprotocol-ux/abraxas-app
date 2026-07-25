// FILE: lib/cmnDesignsDisplay.ts
// Display rules for PSA slab photography on registry surfaces.

import { CMN_POKEMON_HERO_SRC, CMN_DESIGNS_HERO_NUMBER } from "@/lib/cmnDesignsMedia";

/** Featured PSA slab — public/assets/pokemon/psa-hero.jpg */
export const CMN_DESIGNS_HERO_SRC = CMN_POKEMON_HERO_SRC;

/** Non-hero phone shots were captured inverted — rotate 180° CCW when gallery expands */
export function cmnDesignsPhotoRotation(src: string): number {
  if (src === CMN_POKEMON_HERO_SRC || src.endsWith("/psa-hero.jpg")) return 0;
  return src.endsWith(`/cmn${CMN_DESIGNS_HERO_NUMBER}.jpg`) ? 0 : -180;
}

export const CMN_SLAB_FRAME = {
  background:
    "radial-gradient(ellipse 85% 75% at 50% 42%, #1a222c 0%, #0e1318 48%, #06090b 100%)",
  padding: "14px 18px",
} as const;
