// FILE: lib/data/najTulumMedia.ts
// Canonical Naj Tulum imagery — Aldea Zama condo-hotel.

/** Covered terrace · primary registry card (exterior, clean crop). */
export const NAJ_TULUM_REGISTRY_IMAGE = {
  src: "/assets/worldwearables/naj2.jpg",
  objectPosition: "50% 35%",
  alt: "Naj Tulum terrace · Aldea Zama",
} as const;

export const NAJ_TULUM_GALLERY_IMAGES = [
  NAJ_TULUM_REGISTRY_IMAGE.src,
  "/assets/worldwearables/naj3.jpg",
  "/assets/worldwearables/naj4.jpg",
  "/assets/worldwearables/naj.jpg",
] as const;
