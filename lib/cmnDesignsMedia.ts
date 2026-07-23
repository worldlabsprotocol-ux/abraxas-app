// FILE: lib/cmnDesignsMedia.ts
// CMN Designs · PSA Pokémon slab photos (public/assets/cmn-designs/cmn{N}.jpg)

const BASE = "/assets/cmn-designs";

/** Slot numbers on disk — cmn8.jpg intentionally missing */
export const CMN_DESIGNS_PHOTO_NUMBERS = [
  1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29,
] as const;

export const CMN_DESIGNS_HERO_NUMBER = 21;

export function cmnDesignsPhotoPath(n: number): string {
  return `${BASE}/cmn${n}.jpg`;
}

/** Registry hero + slideshow lead — cmn21.jpg */
export const CMN_DESIGNS_REGISTRY_IMAGE = {
  src: cmnDesignsPhotoPath(CMN_DESIGNS_HERO_NUMBER),
  objectPosition: "center center",
  alt: "CMN Designs PSA graded Pokémon slab",
} as const;

/** Slideshow order: hero first, then remaining slabs in numeric order */
export function cmnDesignsSlideshowPaths(): string[] {
  const rest = CMN_DESIGNS_PHOTO_NUMBERS.filter(n => n !== CMN_DESIGNS_HERO_NUMBER);
  return [cmnDesignsPhotoPath(CMN_DESIGNS_HERO_NUMBER), ...rest.map(cmnDesignsPhotoPath)];
}

export const CMN_DESIGNS_GALLERY_PATHS = CMN_DESIGNS_PHOTO_NUMBERS.map(cmnDesignsPhotoPath);
