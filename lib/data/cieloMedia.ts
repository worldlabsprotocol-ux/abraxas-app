// FILE: lib/data/cieloMedia.ts
// Canonical Cielo Sunrise imagery — one hero (wellness dome), avoid repeating
// the same shot across hero / flagship / verifier / loop demo.

/** Mirrored geodesic wellness dome at sunrise (right panel of 04.jpg). */
export const CIELO_HERO_IMAGE = {
  src: "/assets/cielo/04.jpg",
  objectPosition: "78% center",
  alt: "Mirrored wellness dome at sunrise · Cielo Sunrise",
  caption: "Sauna dome · red light · tri-state views",
} as const;

/** Interior / deck with dome — case study gallery lead. */
export const CIELO_DOME_DECK_IMAGE = {
  src: "/assets/cielo/01.jpg",
  objectPosition: "50% 12%",
  alt: "Wellness dome deck · Cielo Sunrise",
} as const;

/** @deprecated Use CIELO_DOME_DECK_IMAGE — 08.jpg had third-party header watermark. */
export const CIELO_PORCH_IMAGE = CIELO_DOME_DECK_IMAGE;

export const CIELO_GALLERY_IMAGES = [
  "/assets/cielo/04.jpg",
  "/assets/cielo/01.jpg",
  "/assets/cielo/07.jpg",
  "/assets/cielo/14.jpg",
  "/assets/cielo/06.jpg",
  "/assets/cielo/20.jpg",
] as const;
