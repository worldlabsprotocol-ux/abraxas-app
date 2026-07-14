// FILE: lib/data/cieloMedia.ts
// Canonical Cielo Sunrise imagery — single-photo exports only (no Airbnb collages).

/** Full property at dusk — cabin, dome, ridgeline (detail / flagship hero). */
export const CIELO_HERO_IMAGE = {
  src: "/assets/cielo/hero-exterior-dusk.jpg",
  objectPosition: "50% 52%",
  alt: "Cielo Sunrise at dusk · log cabin, wellness dome, tri-state views",
  caption: "Private ridgeline retreat · Mineral Bluff, GA",
} as const;

/** Clean twilight dome — home registry cards (simple composition, not busy). */
export const CIELO_REGISTRY_CARD_IMAGE = {
  src: "/assets/cielo/registry-card-exterior.jpg",
  objectPosition: "58% 42%",
  alt: "Cielo Sunrise wellness dome at twilight",
} as const;

/** Deck at golden hour — secondary gallery. */
export const CIELO_PORCH_DUSK_IMAGE = {
  src: "/assets/cielo/porch-deck-sunset.jpg",
  objectPosition: "50% 38%",
  alt: "Cielo Sunrise deck at sunset",
} as const;

/** @deprecated Use CIELO_PORCH_DUSK_IMAGE */
export const CIELO_PORCH_IMAGE = CIELO_PORCH_DUSK_IMAGE;

export const CIELO_DOME_DECK_IMAGE = CIELO_REGISTRY_CARD_IMAGE;

/** Homepage + explorer thumbnails — always the calm exterior card shot. */
export const CIELO_REGISTRY_IMAGE = CIELO_REGISTRY_CARD_IMAGE;

/** Detail galleries (flagship, case study supplemental). */
export const CIELO_GALLERY_IMAGES = [
  CIELO_HERO_IMAGE.src,
  CIELO_REGISTRY_CARD_IMAGE.src,
  CIELO_PORCH_DUSK_IMAGE.src,
] as const;

/** Legacy Airbnb room collages — never use in UI. */
export const CIELO_SKIP_IMAGES = [
  "/assets/cielo/01.jpg",
  "/assets/cielo/02.jpg",
  "/assets/cielo/04.jpg",
  "/assets/cielo/05.jpg",
  "/assets/cielo/06.jpg",
  "/assets/cielo/07.jpg",
  "/assets/cielo/08.jpg",
  "/assets/cielo/13.jpg",
  "/assets/cielo/20.jpg",
  "/assets/cielo/hero-sunset.jpg",
  "/assets/cielo/property-dusk.jpg",
  "/assets/cielo/cabin-porch-dusk.jpg",
  "/assets/cielo/dome-deck-sunset.jpg",
] as const;
