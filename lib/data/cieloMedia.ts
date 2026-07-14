// FILE: lib/data/cieloMedia.ts
// Canonical Cielo Sunrise imagery — curated dusk/exterior set (no Airbnb collages).

/** Full property at sunset — cabin, wellness dome, ridgeline. */
export const CIELO_HERO_IMAGE = {
  src: "/assets/cielo/hero-sunset.jpg",
  objectPosition: "50% 38%",
  alt: "Cielo Sunrise at dusk · log cabin, wellness dome, tri-state views",
  caption: "Private ridgeline retreat · Mineral Bluff, GA",
} as const;

/** Wide dusk angle — dome deck and main cabin. */
export const CIELO_PROPERTY_DUSK_IMAGE = {
  src: "/assets/cielo/property-dusk.jpg",
  objectPosition: "50% 42%",
  alt: "Cielo Sunrise property at dusk",
} as const;

/** Porch string lights and geodesic dome at twilight. */
export const CIELO_PORCH_DUSK_IMAGE = {
  src: "/assets/cielo/cabin-porch-dusk.jpg",
  objectPosition: "50% 35%",
  alt: "Cielo Sunrise cabin porch at twilight",
} as const;

/** Wellness dome deck with sunset ridgeline. */
export const CIELO_DOME_DECK_IMAGE = {
  src: "/assets/cielo/dome-deck-sunset.jpg",
  objectPosition: "50% 30%",
  alt: "Wellness dome deck at sunset · Cielo Sunrise",
} as const;

/** @deprecated Use CIELO_PORCH_DUSK_IMAGE */
export const CIELO_PORCH_IMAGE = CIELO_PORCH_DUSK_IMAGE;

/** Registry cards, explorer thumbnails, product loop. */
export const CIELO_REGISTRY_IMAGE = {
  src: CIELO_HERO_IMAGE.src,
  objectPosition: "50% 32%",
  alt: CIELO_HERO_IMAGE.alt,
} as const;

/** All approved UI surfaces — order matters for galleries. */
export const CIELO_GALLERY_IMAGES = [
  CIELO_HERO_IMAGE.src,
  CIELO_PROPERTY_DUSK_IMAGE.src,
  CIELO_PORCH_DUSK_IMAGE.src,
  CIELO_DOME_DECK_IMAGE.src,
] as const;

/** Skip Airbnb collage panels and legacy watermarked exports. */
export const CIELO_SKIP_IMAGES = [
  "/assets/cielo/07.jpg",
  "/assets/cielo/08.jpg",
] as const;
