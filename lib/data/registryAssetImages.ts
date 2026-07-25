// FILE: lib/data/registryAssetImages.ts
// Canonical registry card images — audited paths only (no stadium placeholders, no watermarked stock).

import { CIELO_REGISTRY_IMAGE } from "@/lib/data/cieloMedia";

/** Smyrna Townhome · 1736 — owner exterior (replaces 011.webp stadium mistake). */
export const SMYRNA_TOWNHOME_IMAGE = {
  src: "/assets/smyrna/townhome-1736.jpg",
  objectPosition: "center center",
  alt: "Smyrna Townhome exterior · 1736",
} as const;

export { CIELO_REGISTRY_IMAGE };

export { CMN_DESIGNS_REGISTRY_IMAGE as CMN_POKEMON_REGISTRY_IMAGE } from "@/lib/cmnDesignsMedia";

/** @deprecated Wrong asset (Truist Park) — do not use in UI. */
export const SMYRNA_LEGACY_STADIUM_PATH = "/assets/smyrna/011.webp";
