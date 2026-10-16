// FILE: lib/brand/officialBrandAssets.ts
// Founder-provided brand asset paths (see public/brand/official/SOURCE.md).

export const OFFICIAL_BRAND_ASSETS = {
  emblem: {
    src: "/brand/official/abraxas-emblem-protocol.png",
    alt: "Abraxas protocol emblem — crystalline verification mark over Earth horizon",
    width: 1024,
    height: 1024,
  },
  protocolBanner: {
    src: "/brand/official/abraxas-protocol-banner.png",
    alt: "Abraxas — Verify what matters. Reveal nothing else. Global independent verification protocol.",
    width: 1920,
    height: 640,
  },
  architectureExhibit: {
    src: "/brand/official/abraxas-protocol-architecture-exhibit.png",
    alt: "Abraxas independent verification architecture — global sectors connected to a central trust crystal",
    width: 1920,
    height: 1080,
  },
} as const;

/**
 * Derived from official emblem PNG — homepage hero only (640 WebP).
 * Source raster is RGB with an embedded square field (no alpha). Hero presentation uses
 * `mix-blend-mode: screen` in CSS to integrate the mark into the dark environment
 * without cropping official geometry.
 */
export const OFFICIAL_EMBLEM_HERO_WEBP = {
  src: "/brand/official/abraxas-emblem-protocol-640.webp",
  width: 640,
  height: 640,
} as const;

/** Canonical UI accent — matches verification green (#4CBB92). PNG assets may contain other hues. */
export const ABRAXAS_BRAND_GREEN = "#4CBB92";
