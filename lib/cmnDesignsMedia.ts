// FILE: lib/cmnDesignsMedia.ts
// CMN Designs · PSA Pokémon slab photos (public/assets/cmn{N}.jpg)

const BASE = "/assets";
const POKEMON_HERO = `${BASE}/pokemon/psa-hero.jpg`;

/** Canonical featured slab — replace public/assets/pokemon/psa-hero.jpg in VS Code */
export const CMN_POKEMON_HERO_SRC = POKEMON_HERO;

/** Slot numbers on disk — cmn8.jpg intentionally missing */
export const CMN_DESIGNS_PHOTO_NUMBERS = [
  1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29,
] as const;

export const CMN_DESIGNS_HERO_NUMBER = 21;

export function cmnDesignsPhotoPath(n: number): string {
  return `${BASE}/cmn${n}.jpg`;
}

/** Registry hero — PSA Pikachu featured slab */
export const CMN_DESIGNS_REGISTRY_IMAGE = {
  src: CMN_POKEMON_HERO_SRC,
  objectPosition: "center center",
  alt: "PSA graded Pokémon trading card slab",
} as const;

/** Slideshow order: hero first, then remaining slabs when gallery expands */
export function cmnDesignsSlideshowPaths(): string[] {
  const rest = CMN_DESIGNS_PHOTO_NUMBERS.filter(n => n !== CMN_DESIGNS_HERO_NUMBER);
  return [CMN_POKEMON_HERO_SRC, ...rest.map(cmnDesignsPhotoPath)];
}

export const CMN_DESIGNS_GALLERY_PATHS = CMN_DESIGNS_PHOTO_NUMBERS.map(cmnDesignsPhotoPath);
