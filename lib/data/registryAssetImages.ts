// FILE: lib/data/registryAssetImages.ts
// Canonical registry card images — audited paths only (no stadium placeholders, no watermarked stock).

import { CIELO_DOME_DECK_IMAGE } from "@/lib/data/cieloMedia";

/** Smyrna Townhome · 1736 — owner exterior (replaces 011.webp stadium mistake). */
export const SMYRNA_TOWNHOME_IMAGE = {
  src: "/assets/smyrna/townhome-1736.jpg",
  objectPosition: "center center",
  alt: "Smyrna Townhome exterior · 1736",
} as const;

/** Cielo Sunrise registry card — owned dome/deck photo (not 08.jpg Porch watermark). */
export const CIELO_REGISTRY_IMAGE = {
  src: CIELO_DOME_DECK_IMAGE.src,
  objectPosition: CIELO_DOME_DECK_IMAGE.objectPosition ?? "center",
  alt: CIELO_DOME_DECK_IMAGE.alt,
} as const;

/** @deprecated Wrong asset (Truist Park) — do not use in UI. */
export const SMYRNA_LEGACY_STADIUM_PATH = "/assets/smyrna/011.webp";
