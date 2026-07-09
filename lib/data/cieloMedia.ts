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

/** Covered mountain porch — secondary showcase, not the primary hero. */
export const CIELO_PORCH_IMAGE = {
  src: "/assets/cielo/08.jpg",
  alt: "Covered porch with mountain views · Cielo Sunrise",
} as const;

/** Interior / deck with dome — case study gallery lead. */
export const CIELO_DOME_DECK_IMAGE = {
  src: "/assets/cielo/01.jpg",
  objectPosition: "50% 12%",
  alt: "Wellness dome deck · Cielo Sunrise",
} as const;

export const CIELO_GALLERY_IMAGES = [
  "/assets/cielo/04.jpg",
  "/assets/cielo/08.jpg",
  "/assets/cielo/07.jpg",
  "/assets/cielo/14.jpg",
  "/assets/cielo/06.jpg",
  "/assets/cielo/20.jpg",
] as const;
