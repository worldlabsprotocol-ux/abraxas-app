// Approved living sphere identity — homepage hero and primary nav (Oct 2026).

export const LIVING_SPHERE_BRAND = {
  hero: {
    src: "/brand/living-sphere/abraxas-living-sphere-hero.jpg",
    alt: "Abraxas — living protocol sphere: layered verification intelligence within a trust boundary",
    width: 1024,
    height: 1024,
  },
  /** Center crop of hero art — navigation and compact lockups (≤48px display). */
  nav: {
    src: "/brand/living-sphere/abraxas-living-sphere-nav-256.jpg",
    alt: "Abraxas living sphere mark",
    width: 256,
    height: 256,
  },
} as const;

/**
 * Founder-approved multicolor 3D emblem in transparent sphere.
 * Use for wallet connection, signing, verification, and all trust-processing UI.
 * Do not substitute crystalline protocol PNG/WebP variants in these surfaces.
 */
export const CANONICAL_TRUST_PROCESSING_EMBLEM = LIVING_SPHERE_BRAND.hero;

export function livingSphereEmblemForSize(emblemSize: number) {
  return emblemSize <= 48 ? LIVING_SPHERE_BRAND.nav : LIVING_SPHERE_BRAND.hero;
}

/** Processing states (wallet modal, proof check, workspace restore). */
export function trustProcessingEmblemForSize(emblemSize: number) {
  return emblemSize <= 40 ? LIVING_SPHERE_BRAND.nav : LIVING_SPHERE_BRAND.hero;
}
