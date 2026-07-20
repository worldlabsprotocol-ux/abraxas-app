// FILE: lib/assets.ts
// Single source of truth for showcase asset media — cards and detail pages must match.

import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import {
  CIELO_DOME_DECK_IMAGE,
  CIELO_HERO_IMAGE,
  CIELO_PORCH_IMAGE,
} from "@/lib/data/cieloMedia";
import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";

export type ShowcaseAssetId = "cielo-sunrise" | "chickasaw-project";

export interface ShowcaseAsset {
  id: ShowcaseAssetId;
  abxId: string;
  name: string;
  assetClass: string;
  location: string;
  /** Primary card / detail hero image */
  image: {
    src: string;
    alt: string;
    objectPosition?: string;
  };
  outcome: string;
  href: string;
  verifyHref: string;
}

export const CIELO_SUNRISE: ShowcaseAsset = {
  id: "cielo-sunrise",
  abxId: FLAGSHIP_PROPERTY.id,
  name: FLAGSHIP_PROPERTY.title,
  assetClass: "Hospitality · Wellness retreat",
  location: "Mineral Bluff, Georgia",
  image: {
    src: CIELO_HERO_IMAGE.src,
    alt: CIELO_HERO_IMAGE.alt,
    objectPosition: CIELO_HERO_IMAGE.objectPosition,
  },
  outcome: "Verified guest booking in under two minutes — no ID re-upload per stay.",
  href: "/case-studies/cielo",
  verifyHref: `/verify/${FLAGSHIP_PROPERTY.id}`,
};

export const CHICKASAW_PROJECT: ShowcaseAsset = {
  id: "chickasaw-project",
  abxId: CPG_ASSET.id,
  name: CPG_ASSET.name,
  assetClass: "Land · Oklahoma growth corridor",
  location: CPG_ASSET.location,
  image: {
    src: CPG_ASSET.image,
    alt: `${CPG_ASSET.name} — Grady County land`,
    objectPosition: "center center",
  },
  outcome: "Registry-ready land diligence — partner updates sync to Abraxas.",
  href: CPG_ASSET.caseStudyPath,
  verifyHref: `/verify/${CPG_ASSET.id}`,
};

/** Live reference assets shown on the landing page — exactly once. */
export const LIVE_PROOF_ASSETS: ShowcaseAsset[] = [CIELO_SUNRISE, CHICKASAW_PROJECT];

export function showcaseAssetByAbxId(abxId: string): ShowcaseAsset | null {
  const q = abxId.trim().toUpperCase();
  return LIVE_PROOF_ASSETS.find((a) => a.abxId.toUpperCase() === q) ?? null;
}

/** Gallery / secondary shots — never substitute for card hero without intent. */
export const CIELO_MEDIA = {
  hero: CIELO_HERO_IMAGE,
  porch: CIELO_PORCH_IMAGE,
  domeDeck: CIELO_DOME_DECK_IMAGE,
} as const;
