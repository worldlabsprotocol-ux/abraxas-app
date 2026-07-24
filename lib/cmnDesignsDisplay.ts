// FILE: lib/cmnDesignsDisplay.ts
// Display rules for PSA slab photography on registry surfaces.

import { CMN_DESIGNS_HERO_NUMBER, cmnDesignsPhotoPath } from "@/lib/cmnDesignsMedia";

/** Hero slab (cmn21) — correct orientation as shot */
export const CMN_DESIGNS_HERO_SRC = cmnDesignsPhotoPath(CMN_DESIGNS_HERO_NUMBER);

/** Non-hero phone shots were captured inverted — rotate 180° CCW for display */
export function cmnDesignsPhotoRotation(src: string): number {
  return src.endsWith(`/cmn${CMN_DESIGNS_HERO_NUMBER}.jpg`) ? 0 : -180;
}

export const CMN_SLAB_FRAME = {
  background:
    "radial-gradient(ellipse 85% 75% at 50% 42%, #1a222c 0%, #0e1318 48%, #06090b 100%)",
  padding: "14px 18px",
} as const;
